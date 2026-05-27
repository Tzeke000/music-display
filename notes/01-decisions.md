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

### 2026-05-27 — Memory: Obsidian vault now + optional mem0
This `notes/` vault is the durable memory. mem0 wired as optional/documented
(needs API key + service), not a hard dependency. See [[05-mem0-integration]].
