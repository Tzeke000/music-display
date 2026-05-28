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

## Done (v0.3 — auto-publisher framework)
- [x] **Publisher** (`publisher/`, run via `npm run pub --`): approval-gated
  posting. Job store + lifecycle (pending→approved→published, held/retryable for
  unconnected platforms), campaign engine (release file → scheduled teaser +
  drop-day drafts), CLI (draft/queue/approve/reject/publish/campaign/connect/
  status), credential seam (`.secrets/`, gitignored), runnable `mock` platform.
  Real YouTube/X/IG/TikTok connectors are spec'd stubs (wiring is the laptop step).
- [x] Asset/content folder scaffold (`assets/`, `content/`) for media + captions.

## Laptop wiring (publisher) — do on the laptop
Sandbox can't hold credentials or reach the APIs; finish these locally.
- [ ] **X: decide how to post — API vs browser vs manual.** X API costs
  **~$100+/mo** (Twitter's fee, not ours). Free options: drive a real logged-in
  browser to "post like a human" (free, but against ToS / some account-flag risk),
  or just post X by hand. **Default: keep spend at $0** — don't pay unless wanted.
- [ ] **Plan around the free three:** YouTube, Instagram, TikTok APIs are all
  **free** — wire their `publish()` calls (specs inline in each connector).
- [ ] Slow-approval prep (start early): TikTok app **audit**; Instagram →
  **Business/Creator** + linked Facebook Page; X developer account + tier (only
  if going the API route).
- [ ] `cp publisher/.env.example publisher/.env`, fill keys, run `connect <platform>` each.
- [ ] Upgrade `lib/tokens.mjs` to OS keychain (`keytar`) for real credential storage.

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
- **Discord bot as the interface** — converse with Claude via Discord (send
  songs/art + get replies, PC or mobile); use it as the publisher's approval
  gate (approve/reject drafts with a tap/reaction).
- **Per-platform output presets** — 9:16 (TikTok/Reels/Shorts), 1:1 / 4:5 (IG),
  16:9 (YouTube) + auto-highlight to cut the catchy segment.
- **Google Calendar** — Claude can schedule release milestones / prep reminders
  there (calendar access available in-session).
