import { createFeatureState, computeFeatures } from './features.js';

/**
 * AudioEngine: plays an audio file through an <audio> element and exposes
 * smoothed frequency features (bass / mid / treble / level / beat) for the
 * visualizer. It also taps the post-gain signal into a MediaStreamDestination
 * so the recorder can capture audio that is perfectly in sync with the video.
 *
 * Feature math lives in ./features.js so the offline renderer produces the
 * exact same reactions from its own FFT.
 */
export class AudioEngine {
  constructor(audioEl) {
    this.el = audioEl;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    this.source = this.ctx.createMediaElementSource(this.el);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 4096;
    this.analyser.smoothingTimeConstant = 0.6;

    this.gain = this.ctx.createGain();
    this.recordDest = this.ctx.createMediaStreamDestination();

    // source -> analyser -> gain -> speakers
    //                         \-> recordDest (for the recorder)
    this.source.connect(this.analyser);
    this.analyser.connect(this.gain);
    this.gain.connect(this.ctx.destination);
    this.gain.connect(this.recordDest);

    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this._state = createFeatureState();
    this._binHz = this.ctx.sampleRate / this.analyser.fftSize;
  }

  /** Load a File/Blob into the audio element. Returns when metadata is ready. */
  load(fileOrUrl) {
    const url = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
    if (this._objUrl) URL.revokeObjectURL(this._objUrl);
    this._objUrl = typeof fileOrUrl === 'string' ? null : url;
    this.el.src = url;
    return new Promise((resolve, reject) => {
      const ok = () => { cleanup(); resolve(); };
      const err = () => { cleanup(); reject(new Error('Could not load audio file.')); };
      const cleanup = () => {
        this.el.removeEventListener('loadedmetadata', ok);
        this.el.removeEventListener('error', err);
      };
      this.el.addEventListener('loadedmetadata', ok);
      this.el.addEventListener('error', err);
      this.el.load();
    });
  }

  async play() {
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    await this.el.play();
  }
  pause() { this.el.pause(); }
  get playing() { return !this.el.paused; }
  get duration() { return this.el.duration || 0; }
  get currentTime() { return this.el.currentTime || 0; }
  seek(t) { this.el.currentTime = t; }

  /** The audio MediaStreamTrack used when recording. */
  get recordingTrack() { return this.recordDest.stream.getAudioTracks()[0]; }

  /**
   * Returns smoothed features in 0..1. `beat` spikes toward 1 on bass onsets
   * and decays, useful for punchy one-shot reactions.
   */
  getFeatures() {
    this.analyser.getByteFrequencyData(this.freq);
    return computeFeatures(this.freq, this._binHz, this._state);
  }
}
