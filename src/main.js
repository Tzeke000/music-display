import { AudioEngine } from './audio/AudioEngine.js';
import { extractCoverArt } from './audio/coverart.js';
import { Visualizer } from './visual/Visualizer.js';
import { Recorder } from './recorder/Recorder.js';
import { buildControls, defaultState } from './ui/controls.js';
import { loadImage } from './util/image.js';

const $ = (id) => document.getElementById(id);

const els = {
  canvas: $('scene'),
  audioEl: $('audioEl'),
  dropzone: $('dropzone'),
  transport: $('transport'),
  playPause: $('playPause'),
  seek: $('seek'),
  cur: $('cur'),
  dur: $('dur'),
  trackTitle: $('trackTitle'),
  audioInput: $('audioInput'),
  imageInput: $('imageInput'),
  pickAudio: $('pickAudio'),
  pickImage: $('pickImage'),
  loadMore: $('loadMore'),
  fullscreen: $('fullscreen'),
  record: $('record'),
  recDot: $('recDot'),
  recTime: $('recTime'),
};

const viz = new Visualizer(els.canvas);
const audio = new AudioEngine(els.audioEl);
const state = { ...defaultState };
buildControls(viz, state);
viz.setResolution('fit');
viz.resize();

let recorder = null;
let userImageChosen = false;
let seeking = false;
let hasArt = false;

// ---------- File handling ----------
async function handleAudioFile(file) {
  await audio.load(file);
  els.trackTitle.textContent = cleanName(file.name);
  els.dur.textContent = fmt(audio.duration);

  // Use embedded cover art unless the user picked their own image.
  if (!userImageChosen) {
    const cover = await extractCoverArt(file);
    if (cover) {
      const img = await loadImage(cover);
      applyArt(img);
    } else if (!hasArt) {
      applyArt(makePlaceholderArt(cleanName(file.name)));
    }
  }
  showPlayer();
}

async function handleImageFile(file) {
  const img = await loadImage(file);
  userImageChosen = true;
  applyArt(img);
}

function applyArt(img) {
  const { detail } = viz.setImage(img, state.density);
  hasArt = true;
  // Surface the auto-pick so the UI reflects what's shown.
  if (state.mode === 'auto') {
    // (kept on 'auto'; Visualizer resolves it internally)
  }
  void detail;
}

// ---------- Player visibility ----------
function showPlayer() {
  els.dropzone.classList.add('hidden');
  els.transport.classList.remove('hidden');
}
function showDropzone() {
  els.dropzone.classList.remove('hidden');
}

// ---------- Transport ----------
async function togglePlay() {
  if (!audio.el.src) return;
  if (audio.playing) {
    audio.pause();
    els.playPause.textContent = '▶';
  } else {
    await audio.play();
    els.playPause.textContent = '⏸';
  }
}

els.playPause.addEventListener('click', togglePlay);
els.seek.addEventListener('input', () => {
  seeking = true;
  const t = (els.seek.value / 1000) * audio.duration;
  els.cur.textContent = fmt(t);
});
els.seek.addEventListener('change', () => {
  audio.seek((els.seek.value / 1000) * audio.duration);
  seeking = false;
});

els.audioEl.addEventListener('ended', () => {
  els.playPause.textContent = '▶';
  if (recorder && recorder.active) stopRecording();
});

// ---------- File pickers + drag/drop ----------
els.pickAudio.addEventListener('click', () => els.audioInput.click());
els.pickImage.addEventListener('click', () => els.imageInput.click());
els.loadMore.addEventListener('click', showDropzone);
els.audioInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleAudioFile(e.target.files[0]);
});
els.imageInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleImageFile(e.target.files[0]);
});

['dragenter', 'dragover'].forEach((ev) =>
  window.addEventListener(ev, (e) => { e.preventDefault(); els.dropzone.classList.add('dragging'); })
);
['dragleave', 'drop'].forEach((ev) =>
  window.addEventListener(ev, (e) => { e.preventDefault(); els.dropzone.classList.remove('dragging'); })
);
window.addEventListener('drop', (e) => {
  e.preventDefault();
  for (const file of e.dataTransfer.files) {
    if (file.type.startsWith('audio/') || /\.(mp3|wav)$/i.test(file.name)) handleAudioFile(file);
    else if (file.type.startsWith('image/')) handleImageFile(file);
  }
});

// ---------- Recording ----------
function startRecording() {
  if (!hasArt) return;
  recorder = new Recorder(viz.domElement, audio.recordingTrack);
  recorder.onstop = () => {
    els.record.classList.remove('recording');
    els.record.textContent = '● Record';
    els.recDot.classList.add('hidden');
  };
  // Record the whole song from the start for a clean export.
  audio.seek(0);
  audio.play();
  els.playPause.textContent = '⏸';
  recorder.start(60);
  els.record.classList.add('recording');
  els.record.textContent = '■ Stop';
  els.recDot.classList.remove('hidden');
}
function stopRecording() {
  if (recorder) recorder.stop();
}
els.record.addEventListener('click', () => {
  if (recorder && recorder.active) stopRecording();
  else startRecording();
});

// ---------- Fullscreen + keyboard ----------
els.fullscreen.addEventListener('click', toggleFullscreen);
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  else if (e.key === 'r' || e.key === 'R') els.record.click();
});

// ---------- Idle UI fade ----------
let idleTimer;
function poke() {
  els.transport.classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => els.transport.classList.add('idle'), 3500);
}
window.addEventListener('pointermove', poke);
poke();

// ---------- Resize + loop ----------
window.addEventListener('resize', () => viz.resize());

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;

  const features = audio.el.src && audio.playing
    ? audio.getFeatures()
    : { bass: 0, mid: 0, treble: 0, level: 0, beat: 0 };

  viz.update(features, t, dt);

  // Sync transport readouts.
  if (audio.duration && !seeking) {
    els.seek.value = Math.round((audio.currentTime / audio.duration) * 1000);
    els.cur.textContent = fmt(audio.currentTime);
  }
  if (recorder && recorder.active) els.recTime.textContent = fmt(recorder.elapsed);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------- Helpers ----------
function fmt(s) {
  s = Math.max(0, Math.floor(s || 0));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
function cleanName(name) {
  return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
}

/** Generate a fallback artwork (gradient + title) when none is supplied. */
function makePlaceholderArt(title) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 1024;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 1024, 1024);
  g.addColorStop(0, '#ff2d95');
  g.addColorStop(0.5, '#8b5cff');
  g.addColorStop(1, '#1ad1ff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 1024);
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 60; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 1024, Math.random() * 1024, Math.random() * 120 + 10, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 ? '#ffffff' : '#000000';
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.font = 'bold 70px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title.slice(0, 22), 512, 540);
  return c; // canvas is a valid texture/drawImage source
}
