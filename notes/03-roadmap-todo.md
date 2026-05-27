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

## Next up
- [ ] **Offline MP4 renderer (phase 2):**
  - Precompute features with `OfflineAudioContext` (or Python/librosa).
  - Render frames headless (Puppeteer + headless Chrome WebGL) stepping by
    feature frame; capture PNGs.
  - `ffmpeg` mux frames + original audio → H.264 MP4.
  - CLI: `node tools/render <audio> <image> [--mode] [--res] [--fps]`.
- [ ] Style presets (e.g. "Drop", "Chill", "Glitch") saved/restored.
- [ ] Text overlay (track title / artist) toggle for the video.
- [ ] More particle behaviors: gravity wells, audio-reactive color cycling.
- [ ] Beat-synced camera moves / "drop" reactions on big onsets.
- [ ] Save/load settings to localStorage + shareable preset JSON.

## Ideas / parking lot
- Spectrogram ring around the art.
- Use the artist logo as a watermark option.
- Per-section automation (intro/verse/drop) via simple energy segmentation.
