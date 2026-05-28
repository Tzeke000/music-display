import { fft, blackmanWindow } from '../util/fft.js';
import { createFeatureState, computeFeatures } from './features.js';

/**
 * Precompute a per-frame feature track from decoded PCM, replicating Web Audio's
 * AnalyserNode.getByteFrequencyData (Blackman window → FFT → normalized
 * magnitude → temporal smoothing → dB → 0..255 byte mapping) and then running
 * the same band/smoothing/beat logic the live engine uses. This makes the
 * offline MP4 render frame-accurate and visually identical to the preview.
 *
 * @returns {{ frames: object[], fps: number, totalFrames: number }}
 */
export function analyzeAudio(pcm, sampleRate, opts) {
  const {
    fps,
    duration,
    start = 0,
    fftSize = 4096,
    smoothing = 0.6, // matches AnalyserNode.smoothingTimeConstant in AudioEngine
    minDb = -100,
    maxDb = -30,
  } = opts;

  const totalFrames = Math.max(1, Math.floor(duration * fps));
  const binCount = fftSize / 2;
  const binHz = sampleRate / fftSize;
  const window = blackmanWindow(fftSize);
  const smoothed = new Float32Array(binCount);
  const re = new Float32Array(fftSize);
  const im = new Float32Array(fftSize);
  const spectrum = new Uint8Array(binCount);
  const state = createFeatureState();
  const range = maxDb - minDb;
  const frames = [];

  for (let f = 0; f < totalFrames; f++) {
    const t = start + f / fps;
    const startSample = Math.round(t * sampleRate);

    for (let i = 0; i < fftSize; i++) {
      const s = startSample + i;
      re[i] = (s >= 0 && s < pcm.length ? pcm[s] : 0) * window[i];
      im[i] = 0;
    }
    fft(re, im);

    for (let k = 0; k < binCount; k++) {
      const mag = Math.hypot(re[k], im[k]) / fftSize;
      smoothed[k] = smoothing * smoothed[k] + (1 - smoothing) * mag;
      const db = 20 * Math.log10(smoothed[k] || 1e-12);
      const b = Math.floor((255 * (db - minDb)) / range);
      spectrum[k] = b < 0 ? 0 : b > 255 ? 255 : b;
    }

    frames.push(computeFeatures(spectrum, binHz, state));
  }

  return { frames, fps, totalFrames };
}

/** Downmix an AudioBuffer to a mono Float32Array. */
export function mixToMono(audioBuffer) {
  const ch = audioBuffer.numberOfChannels;
  const len = audioBuffer.length;
  if (ch === 1) return audioBuffer.getChannelData(0);
  const out = new Float32Array(len);
  for (let c = 0; c < ch; c++) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < len; i++) out[i] += data[i];
  }
  for (let i = 0; i < len; i++) out[i] /= ch;
  return out;
}
