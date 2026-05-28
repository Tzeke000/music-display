/**
 * Turns a release definition (content/releases/<song>.json) into a set of draft
 * jobs: teaser posts in the days before the drop, then "out now" posts at drop
 * time. Jobs are still created as `pending` — nothing posts without approval.
 *
 * Release file shape:
 * {
 *   "song": "Paper Fox",
 *   "smartLink": "https://...",            // one link -> all streaming services
 *   "dropAt": "2026-06-15T12:00:00Z",
 *   "teasers": [
 *     { "daysBefore": 7, "platforms": ["tiktok","instagram"],
 *       "video": "exports/tiktok/teaser1.mp4", "caption": "working on something 👀" }
 *   ],
 *   "release": {
 *     "platforms": ["youtube","tiktok","instagram","x"],
 *     "video": "exports/youtube/paper-fox.mp4",
 *     "caption": "OUT NOW: {song} 🎧 {smartLink}"
 *   }
 * }
 */
import { readFileSync } from 'node:fs';

export function loadRelease(path) {
  const r = JSON.parse(readFileSync(path, 'utf8'));
  if (!r.song) throw new Error('release: "song" is required');
  if (!r.dropAt) throw new Error('release: "dropAt" (ISO datetime) is required');
  return r;
}

function fill(template, ctx) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, k) => (k in ctx ? ctx[k] : `{${k}}`));
}

function shiftDays(iso, days) {
  return new Date(new Date(iso).getTime() - days * 86400_000).toISOString();
}

/** Expand into plain draft specs (not yet persisted). */
export function expand(release) {
  const ctx = { song: release.song, smartLink: release.smartLink || '' };
  const drafts = [];

  for (const t of release.teasers || []) {
    for (const platform of t.platforms) {
      drafts.push({
        platform,
        type: 'teaser',
        video: t.video || null,
        image: t.image || null,
        caption: fill(t.caption, ctx),
        hashtags: t.hashtags || [],
        scheduledAt: shiftDays(release.dropAt, t.daysBefore ?? 0),
        meta: { song: release.song },
      });
    }
  }

  const rel = release.release;
  if (rel) {
    for (const platform of rel.platforms) {
      drafts.push({
        platform,
        type: 'release',
        video: rel.video || null,
        image: rel.image || null,
        caption: fill(rel.caption, ctx),
        hashtags: rel.hashtags || [],
        scheduledAt: release.dropAt,
        meta: { song: release.song },
      });
    }
  }

  return drafts.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
}
