/**
 * Shared, engine-agnostic audio-feature logic so the live app and the offline
 * renderer react identically. Both feed a 0..255 frequency spectrum (live: from
 * AnalyserNode.getByteFrequencyData; offline: from our own windowed FFT) through
 * the same band averaging, asymmetric smoothing and beat detection.
 */

export function createFeatureState() {
  return { bass: 0, mid: 0, treble: 0, level: 0, beat: 0, bassAvg: 0 };
}

/** Average a frequency band [loHz, hiHz] from a 0..255 spectrum → 0..1. */
export function bandLevel(spectrum, binHz, loHz, hiHz) {
  const lo = Math.max(0, Math.floor(loHz / binHz));
  const hi = Math.min(spectrum.length - 1, Math.ceil(hiHz / binHz));
  let sum = 0;
  for (let i = lo; i <= hi; i++) sum += spectrum[i];
  return sum / Math.max(1, hi - lo + 1) / 255;
}

// Rise fast, fall slower — gives a lively but not jittery response.
function smooth(prev, next, attack = 0.5, release = 0.12) {
  return prev + (next - prev) * (next > prev ? attack : release);
}

/**
 * Advance `state` by one analysis frame and return a features snapshot
 * { bass, mid, treble, level, beat } in 0..1. Returns a fresh object each call
 * so callers can keep an array of frames.
 */
export function computeFeatures(spectrum, binHz, state) {
  const bass = bandLevel(spectrum, binHz, 20, 160);
  const mid = bandLevel(spectrum, binHz, 160, 2000);
  const treble = bandLevel(spectrum, binHz, 2000, 9000);
  const level = (bass * 1.2 + mid + treble * 0.8) / 3;

  state.bass = smooth(state.bass, bass);
  state.mid = smooth(state.mid, mid);
  state.treble = smooth(state.treble, treble);
  state.level = smooth(state.level, level);

  // Beat: bass energy exceeding a margin over its running average.
  state.bassAvg = state.bassAvg * 0.95 + bass * 0.05;
  if (bass > state.bassAvg * 1.35 && bass > 0.12) {
    state.beat = Math.min(1, state.beat + 0.9);
  }
  state.beat *= 0.86;

  return {
    bass: state.bass,
    mid: state.mid,
    treble: state.treble,
    level: state.level,
    beat: state.beat,
  };
}
