/**
 * AudioEngine: plays an audio file through an <audio> element and exposes
 * smoothed frequency features (bass / mid / treble / level / beat) for the
 * visualizer. It also taps the post-gain signal into a MediaStreamDestination
 * so the recorder can capture audio that is perfectly in sync with the video.
 *
 * The features object is intentionally simple and engine-agnostic so the same
 * scene-update code can be reused by the offline renderer (phase 2), which will
 * feed pre-computed features instead of a live AnalyserNode.
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

    // Smoothed feature state with separate attack/release for a lively feel.
    this._s = { bass: 0, mid: 0, treble: 0, level: 0 };
    this._beat = 0;
    this._bassAvg = 0; // running average for beat detection
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

  /** Average a frequency band [loHz, hiHz] from the byte spectrum, 0..1. */
  _band(loHz, hiHz) {
    const lo = Math.max(0, Math.floor(loHz / this._binHz));
    const hi = Math.min(this.freq.length - 1, Math.ceil(hiHz / this._binHz));
    let sum = 0;
    for (let i = lo; i <= hi; i++) sum += this.freq[i];
    const n = Math.max(1, hi - lo + 1);
    return sum / n / 255;
  }

  /**
   * Returns smoothed features in 0..1. `beat` spikes toward 1 on bass onsets
   * and decays, useful for punchy one-shot reactions.
   */
  getFeatures() {
    this.analyser.getByteFrequencyData(this.freq);

    const bass = this._band(20, 160);
    const mid = this._band(160, 2000);
    const treble = this._band(2000, 9000);
    const level = (bass * 1.2 + mid + treble * 0.8) / 3;

    // Asymmetric smoothing: rise fast, fall slower.
    const smooth = (prev, next, attack = 0.5, release = 0.12) =>
      prev + (next - prev) * (next > prev ? attack : release);

    this._s.bass = smooth(this._s.bass, bass);
    this._s.mid = smooth(this._s.mid, mid);
    this._s.treble = smooth(this._s.treble, treble);
    this._s.level = smooth(this._s.level, level);

    // Beat detection: bass energy exceeding a margin over its running average.
    this._bassAvg = this._bassAvg * 0.95 + bass * 0.05;
    if (bass > this._bassAvg * 1.35 && bass > 0.12) {
      this._beat = Math.min(1, this._beat + 0.9);
    }
    this._beat *= 0.86; // decay

    return {
      bass: this._s.bass,
      mid: this._s.mid,
      treble: this._s.treble,
      level: this._s.level,
      beat: this._beat,
    };
  }
}
