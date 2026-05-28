# Project Overview

**Goal:** A unique, 3D audio visualizer that reacts to a song (.mp3/.wav) and
uses cover art or a custom art piece, producing a video for YouTube.

**For:** Tzeke000 (Future Bass / EDM / Pop). See [[04-brand-style]].

## Core idea
Take a picture and turn it into a *reactive 3D picture*:
- **Particles mode** — the art dissolves into a cloud of thousands of GPU points
  that pulse, ripple, scatter and reassemble with the music. The "unique" core.
- **Whole-image mode** — for art that isn't busy enough to be a good point cloud,
  the entire picture reacts to the bass (dome pulse, ripples, chromatic shimmer).
- **Both** — faint reactive card + particle sparkle overlay.
- **Auto** — picks particles vs image from the picture's visual busyness.

## How a video gets made
- **Now:** in-browser recorder captures canvas + audio → a `.webm` (uploads
  straight to YouTube).
- **Phase 2:** offline renderer (precompute features → headless render frames →
  ffmpeg mux) for a high-quality `.mp4`. See [[03-roadmap-todo]].

## Inputs
- Audio: `.mp3` / `.wav` (decoded via Web Audio).
- Art: optional image upload; embedded MP3 cover art used automatically; a
  branded gradient placeholder is generated if neither is present.
