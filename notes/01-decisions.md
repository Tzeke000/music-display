# Decision Log

### 2026-05-27 — Tech stack: Three.js + Web Audio, built with Vite
Genuine GPU 3D, real-time analysis, instant preview, and the scene code can be
reused by the phase-2 offline renderer. Vite gives a simple dev server + a
static build. Alternatives (pure Python offline render) rejected as the primary
path because iteration on the *look* is slower and 3D is harder.

### 2026-05-27 — Delivery: app first, offline exporter later
User chose "Both (app first, exporter later)". In-browser `MediaRecorder`
already yields a YouTube-ready WebM; MP4 exporter is phase 2.

### 2026-05-27 — Visual style: morph of particles + floating card
User wanted a morph of "art-as-3D-particles" and "floating art card". Implemented
as two layers (ArtParticles + ArtPlane) with display modes particles/image/both
and an `auto` heuristic.

### 2026-05-27 — Added "whole image reacts to bass" mode
Per user: if a picture doesn't have enough points to make a good cloud, react
the whole image instead. Implemented as `ArtPlane` (image mode).

### 2026-05-27 — Cover art: hand-rolled ID3 APIC parser (no dependency)
Avoids pulling a metadata lib + Node polyfills into the browser bundle. ~80 lines
in `src/audio/coverart.js`.

### 2026-05-27 — Theme to Tzeke000 brand
Pulled palette/fonts from the artist's site repo. See [[04-brand-style]].

### 2026-05-27 — Offline renderer: Puppeteer + ffmpeg-static, deterministic
Render the same scene headlessly frame-by-frame (t = frame/fps) and pipe frames
to ffmpeg, rather than transcoding a real-time capture. Features are precomputed
with our own Blackman-windowed FFT replicating Web Audio's byte mapping, so the
MP4 matches the live preview. No system ffmpeg/Chrome needed (bundled binaries).

### 2026-05-27 — AI auto-config deferred to phase 3; use Claude's own vision now
User wants AI ("Nano Banana"/Gemini) to decide per-picture rendering later. For
now Claude inspects each image directly (multimodal) to set defaults. Research
open GitHub vision models when building phase 3. Default render output: 1440p60.

### 2026-05-27 — Memory: Obsidian vault now + optional mem0
This `notes/` vault is the durable memory. mem0 wired as optional/documented
(needs API key + service), not a hard dependency. See [[05-mem0-integration]].

### 2026-05-28 — Auto-publisher: approval-gated, built as a framework
User wants finished videos auto-posted to YouTube/TikTok/Instagram/X with
per-platform tailoring, plus release campaigns (teasers → drop-day "out now" +
smart link). Policy chosen: **approve every post**. Built `publisher/` as a
runnable framework (mock platform proves the loop); live API wiring is the
laptop step (sandbox is ephemeral + can't hold credentials). See [[03-roadmap-todo]].

### 2026-05-28 — Platform API costs: only X charges; keep spend at $0
YouTube, Instagram, TikTok APIs are **free** (other gates: quota, Business
account, audit — but no fee). **X charges ~$100+/mo** for API posting. User does
not want to spend extra. Plan: wire the free three via official APIs; for X,
decide later between browser-automation ("post like a human", free but against
ToS / account-risk) or posting manually. Don't pay unless the user opts in.
