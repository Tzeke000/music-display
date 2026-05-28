#!/usr/bin/env node
/**
 * Offline MP4 renderer for Music Display.
 *
 * Renders the SAME Three.js visualizer (src/render-main.js) frame-by-frame in
 * headless Chrome, deterministically (t = frame/fps, precomputed features), and
 * pipes each frame into ffmpeg, muxing with the original audio → H.264 MP4.
 *
 * Usage:
 *   npm run render -- --audio song.wav --image cover.png \
 *     [--mode auto|particles|image|both] [--res 720|1080|1440|2160] \
 *     [--fps 30|60] [--duration SEC] [--start SEC] [--density N] \
 *     [--reactivity R] [--out exports/out.mp4] [--still]
 *
 * Notes:
 * - Audio/image can be any local path; supports .wav and .mp3.
 * - Uses Vite to serve the source (no separate build step required).
 * - Software WebGL (SwiftShader) is fine but slow; lower res/duration for tests.
 */
import { createServer } from 'vite';
import puppeteer from 'puppeteer';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { resolve, extname, dirname, basename } from 'node:path';

// ---------- args ----------
function parseArgs(argv) {
  const a = { mode: 'auto', res: 1440, fps: 60, density: 60000, reactivity: 1.0 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) continue;
    const key = k.slice(2);
    const next = argv[i + 1];
    if (key === 'still') { a.still = true; continue; }
    a[key] = next; i++;
  }
  return a;
}
const args = parseArgs(process.argv.slice(2));

if (!args.audio || !args.image) {
  console.error('Required: --audio <file> --image <file>');
  console.error('Example: npm run render -- --audio song.wav --image cover.png --res 1440 --fps 60 --duration 15');
  process.exit(1);
}
const audioPath = resolve(args.audio);
const imagePath = resolve(args.image);
for (const [label, p] of [['audio', audioPath], ['image', imagePath]]) {
  if (!existsSync(p)) { console.error(`Missing ${label}: ${p}`); process.exit(1); }
}

const RES_HEIGHTS = { 720: 720, 1080: 1080, 1440: 1440, 2160: 2160 };
const height = RES_HEIGHTS[Number(args.res)] || 1440;
const width = Math.round((height * 16) / 9);
const fps = Number(args.fps) || 60;
const duration = args.duration ? Number(args.duration) : null;
const start = args.start ? Number(args.start) : 0;
const out = resolve(args.out || `exports/${basename(imagePath, extname(imagePath))}-${height}p.mp4`);
mkdirSync(dirname(out), { recursive: true });

const MIME = { '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const contentType = (p) => MIME[extname(p).toLowerCase()] || 'application/octet-stream';

// ---------- serve source + media via Vite ----------
// hmr:false so editing source during a render can't reload (and destroy) the
// headless page mid-capture.
const server = await createServer({
  logLevel: 'warn',
  server: { host: '127.0.0.1', open: false, hmr: false },
});
const mediaMiddleware = (req, res, next) => {
  const url = req.url.split('?')[0];
  const file = url === '/__audio' ? audioPath : url === '/__image' ? imagePath : null;
  if (!file) return next();
  res.setHeader('Content-Type', contentType(file));
  res.setHeader('Content-Length', statSync(file).size);
  createReadStream(file).pipe(res);
};
server.middlewares.use(mediaMiddleware);
// Run our media routes BEFORE Vite's own middlewares (which would 404 them).
server.middlewares.stack.unshift(server.middlewares.stack.pop());
await server.listen();
const port = server.config.server.port;
const url = `http://127.0.0.1:${port}/render.html`;

// ---------- launch headless Chrome with software WebGL ----------
const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    `--window-size=${width},${height}`,
  ],
});

let exitCode = 0;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: Math.min(width, 1280), height: Math.min(height, 720) });
  page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));

  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction('window.__RENDERER_READY === true', { timeout: 30000 });

  console.log(`Setup: ${width}x${height} @ ${fps}fps  mode=${args.mode}  audio=${basename(audioPath)}`);
  const info = await page.evaluate((opts) => window.RENDERER.setup(opts), {
    audioUrl: '/__audio',
    imageUrl: '/__image',
    width, height, fps,
    mode: args.mode,
    density: Number(args.density),
    reactivity: Number(args.reactivity),
    duration, start,
  });
  const total = info.totalFrames;
  console.log(`Rendering ${total} frames (${(total / fps).toFixed(1)}s of audio)...`);

  // Optional: dump a still ~40% in for quick visual inspection.
  if (args.still) {
    const idx = Math.floor(total * 0.4);
    const dataUrl = await page.evaluate((i) => window.RENDERER.renderFrame(i, 'image/png'), idx);
    const stillPath = out.replace(/\.mp4$/, '-still.png');
    writeFileSync(stillPath, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log(`Still frame: ${stillPath}`);
  }

  // ---------- ffmpeg ----------
  const ff = spawn(ffmpegPath, [
    '-y',
    '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-i', audioPath,
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '320k',
    '-shortest', '-movflags', '+faststart',
    out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  for (let i = 0; i < total; i++) {
    const dataUrl = await page.evaluate((f) => window.RENDERER.renderFrame(f), i);
    const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % fps === 0 || i === total - 1) {
      process.stdout.write(`\r  frame ${i + 1}/${total} (${Math.round(((i + 1) / total) * 100)}%)   `);
    }
  }
  ff.stdin.end();
  console.log('\nEncoding...');
  await new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
  console.log(`\n✓ Done: ${out}`);
} catch (err) {
  console.error('\nRender failed:', err.message);
  exitCode = 1;
} finally {
  await browser.close();
  await server.close();
  process.exit(exitCode);
}
