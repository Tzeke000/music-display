# Roadmap & TODO

## Done (v0.1)
- [x] Vite project + brand theme (Tzeke000 palette/fonts)
- [x] Audio engine with band analysis + beat detection
- [x] Embedded MP3 cover-art extraction
- [x] ArtParticles (image → reactive GPU point cloud, morph)
- [x] ArtPlane (whole-image reacts to bass) + auto mode
- [x] Background gradient (from art palette) + starfield
- [x] Bloom post-processing, camera parallax/auto-orbit
- [x] Transport (play/seek/fullscreen), drag & drop, keyboard
- [x] In-browser recorder → WebM (canvas + audio)
- [x] lil-gui Look & Feel panel + fixed-resolution recording

## Done (v0.2 — offline renderer)
- [x] **Offline MP4 renderer (phase 2):** `npm run render` — Puppeteer headless
  Chrome (SwiftShader WebGL) renders the same scene frame-by-frame,
  deterministically; offline FFT (`src/audio/offlineAnalyzer.js` + `util/fft.js`)
  precomputes features matching the live AnalyserNode; `ffmpeg-static` muxes →
  H.264 MP4. Feature math shared via `src/audio/features.js`.

## Next up
- [ ] **Phase 3 — AI per-picture auto-config:** a vision model inspects each
  image and picks mode + tuning (subject, palette, energy). User deferred this;
  for now Claude's own multimodal vision sets per-image defaults. When building:
  **research open vision models on GitHub** (user asked) for an offline/cheaper
  alternative to a hosted API; needs an API key + outbound network (may be
  restricted in the cloud env).
- [ ] Style presets (e.g. "Drop", "Chill", "Glitch") saved/restored.
- [ ] Text overlay (track title / artist) toggle for the video.
- [ ] More particle behaviors: gravity wells, audio-reactive color cycling.
- [ ] Beat-synced camera moves / "drop" reactions on big onsets.
- [ ] Save/load settings to localStorage + shareable preset JSON.

## Ideas / parking lot
- Spectrogram ring around the art.
- Use the artist logo as a watermark option.
- Per-section automation (intro/verse/drop) via simple energy segmentation.
