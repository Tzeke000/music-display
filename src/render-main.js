/**
 * Offline-render page entry. Exposes `window.RENDERER` so the Node CLI
 * (tools/render/render.mjs) can drive a deterministic, frame-by-frame render of
 * the SAME visualizer used live, then pipe each frame to ffmpeg.
 *
 * Determinism: time is driven as t = frame/fps (not wall-clock), features come
 * from a precomputed track, and preserveDrawingBuffer lets us read each frame.
 */
import { Visualizer } from './visual/Visualizer.js';
import { loadImage } from './util/image.js';
import { analyzeAudio, mixToMono } from './audio/offlineAnalyzer.js';

let viz = null;
let frames = [];
let fps = 60;

window.RENDERER = {
  async setup(opts) {
    const canvas = document.getElementById('scene');
    viz = new Visualizer(canvas, { preserveDrawingBuffer: true });

    // Fixed output resolution (exact backing-store size).
    viz.fixedSize = { w: opts.width, h: opts.height };
    viz.resize();

    const img = await loadImage(opts.imageUrl);
    viz.setImage(img, opts.density ?? 45000);
    if (opts.mode) viz.setMode(opts.mode);
    if (opts.reactivity != null) viz.setReactivity(opts.reactivity);
    if (opts.bloom != null) viz.setBloom(opts.bloom);
    if (opts.pointSize != null) viz.setPointSize(opts.pointSize);
    if (opts.autoRotate != null) viz.autoRotate = opts.autoRotate;

    // Decode audio and precompute the feature track.
    const buf = await fetch(opts.audioUrl).then((r) => r.arrayBuffer());
    const AC = window.OfflineAudioContext || window.AudioContext;
    const decodeCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await decodeCtx.decodeAudioData(buf);
    decodeCtx.close?.();

    const pcm = mixToMono(audioBuffer);
    fps = opts.fps;
    const duration = Math.min(
      opts.duration || audioBuffer.duration,
      audioBuffer.duration - (opts.start || 0)
    );
    const result = analyzeAudio(pcm, audioBuffer.sampleRate, {
      fps,
      duration,
      start: opts.start || 0,
    });
    frames = result.frames;

    return { totalFrames: frames.length, fps, audioDuration: audioBuffer.duration };
  },

  totalFrames() {
    return frames.length;
  },

  /** Render frame `i` deterministically and return it as a data URL. */
  renderFrame(i, format = 'image/jpeg', quality = 0.95) {
    const t = i / fps;
    const dt = 1 / fps;
    viz.update(frames[i] || { bass: 0, mid: 0, treble: 0, level: 0, beat: 0 }, t, dt);
    return viz.domElement.toDataURL(format, quality);
  },
};

// Signal readiness for the driver to await.
window.__RENDERER_READY = true;
