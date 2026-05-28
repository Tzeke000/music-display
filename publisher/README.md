# publisher/ — approval-gated auto-poster

Takes finished videos + captions and posts them to YouTube, X, Instagram, and
TikTok on a schedule. Policy: **approve every post** — a draft never goes live
until you approve it.

```
media + caption → draft (pending) → you approve → publish (at scheduled time) → posted
```

## What runs where

- **This repo (any machine, incl. mobile):** drafting, the approval queue,
  campaign expansion, scheduling, status — everything except the live API calls.
  Exercise the whole loop with the built-in `mock` platform.
- **The laptop only:** real account authorization and posting. The sandbox is
  ephemeral and must never hold your credentials.

## Commands

```bash
npm run pub -- platforms                       # list platforms
npm run pub -- draft --platform mock --caption "hello" --video exports/sample.mp4
npm run pub -- queue                           # see all jobs
npm run pub -- approve <id>                     # pending -> approved
npm run pub -- publish --due                    # post approved jobs whose time has come
npm run pub -- campaign content/releases/example.json --apply   # expand a release
npm run pub -- connect youtube                  # print account setup steps
npm run pub -- status
```

## Layout

- `cli.mjs` — command entry point (`npm run pub -- <cmd>`).
- `lib/jobs.mjs` — job lifecycle / state machine.
- `lib/store.mjs` — JSON job store (`.data/`, gitignored).
- `lib/tokens.mjs` — credential storage seam (`.secrets/`, gitignored; upgrade to OS keychain later).
- `lib/campaign.mjs` — expands a release file into teaser + drop-day jobs.
- `lib/platforms/` — one connector per platform + a runnable `mock`.

## Credentials

Copy `.env.example` → `.env` (gitignored) and fill on the laptop. OAuth tokens
from `connect` are stored in `.secrets/` (gitignored), never in the repo or chat.

## Status of platform connectors

The framework is complete and runnable. The four real connectors carry the exact
API wiring spec in their `publish()` and `connect()` methods; finishing those
live calls is the laptop step (where the APIs are reachable and credentials can
live safely). Until then they report "held — not connected" and the job stays
approved/retryable.
