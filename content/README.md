# content/ — captions, voice, and release campaigns

Text and planning that drives what gets posted (separate from the raw media in
`assets/`).

- `brand-voice/` — example captions / tweets that sound like you. Read these to
  match your tone before drafting anything.
- `captions/` — drafted + approved captions per post. Nothing publishes without
  an explicit approval here.
- `releases/` — release calendar and smart links: the teaser schedule
  ("working on something") leading into drop-day ("out now on Spotify / Apple
  Music / etc.").

## Where finished videos go

Rendered output lands in `exports/` (gitignored — outputs, not source),
organized per platform on the machine that runs the publisher:

```
exports/youtube/   16:9   full-length music + gaming
exports/tiktok/    9:16   short action-packed clips / teasers
exports/instagram/ 1:1, 4:5  stills, carousels, reels
exports/twitter/   16:9 or 1:1  short clips + casual posts
```
