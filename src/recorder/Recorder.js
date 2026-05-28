/**
 * Recorder captures the canvas (video) + the engine's audio tap into a single
 * WebM file via MediaRecorder. WebM (VP9/Opus) uploads directly to YouTube; the
 * phase-2 offline renderer will produce MP4 for users who need it.
 */
export class Recorder {
  constructor(canvas, audioTrack) {
    this.canvas = canvas;
    this.audioTrack = audioTrack;
    this.recorder = null;
    this.chunks = [];
    this.startedAt = 0;
    this.onstop = null;
  }

  get active() { return this.recorder && this.recorder.state === 'recording'; }

  start(fps = 60) {
    const stream = this.canvas.captureStream(fps);
    if (this.audioTrack) stream.addTrack(this.audioTrack);

    const mime = pickMimeType();
    this.recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 16_000_000,
    });
    this.chunks = [];
    this.recorder.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    this.recorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: this.recorder.mimeType.split(';')[0] });
      this._download(blob);
      if (this.onstop) this.onstop(blob);
    };
    this.recorder.start(1000);
    this.startedAt = performance.now();
  }

  stop() {
    if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
  }

  get elapsed() {
    return this.active ? (performance.now() - this.startedAt) / 1000 : 0;
  }

  _download(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    a.href = url;
    a.download = `music-display-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}

function pickMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c;
  }
  return 'video/webm';
}
