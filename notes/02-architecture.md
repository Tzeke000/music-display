# Architecture

```
index.html            # shell: canvas + overlay UI (dropzone, transport)
src/
  main.js             # bootstrap: file loading, transport, recorder, loop
  style.css           # brand-themed UI
  audio/
    AudioEngine.js    # <audio> -> AnalyserNode; getFeatures(); recording tap
    coverart.js       # ID3v2 APIC extractor (embedded MP3 cover art)
  visual/
    Visualizer.js     # renderer + scene + camera + bloom; mode orchestration
    ArtParticles.js   # image -> GPU point cloud (morph home<->scatter)
    ArtPlane.js       # whole-image reactive panel (bass dome / ripple / CA)
    Background.js      # palette gradient + drifting starfield
  recorder/
    Recorder.js       # canvas+audio -> WebM via MediaRecorder
  ui/
    controls.js       # lil-gui "Look & Feel" panel + default state
  util/
    image.js          # loadImage, sampleGrid, detailScore (auto mode)
    palette.js        # dominant-color extraction for background
public/
  tzeke000.jpg        # favicon / brand asset
```

## Data flow (live)
`audio file -> AudioEngine` → each frame `getFeatures()` returns
`{ bass, mid, treble, level, beat }` (0..1, smoothed) → `Visualizer.update()`
drives uniforms in ArtParticles/ArtPlane/Background → `EffectComposer` (bloom)
renders to canvas → `Recorder` captures canvas + the audio tap.

## Feature contract (reused by the offline renderer)
The scene only depends on the **features object**, not on the AnalyserNode.
The phase-2 renderer will precompute a per-frame array of the same shape and
feed it frame-by-frame, so visuals stay identical and perfectly synced.

## Reactivity mapping
- **bass** → particle dissolve/outward push; plane dome; camera push-in.
- **mid** → ripples across the picture.
- **treble** → particle sparkle/size jitter; plane chromatic aberration.
- **beat** → punch on dissolve, point size, plane brightness, bloom.
- **level** → background brighten + global bloom strength.
