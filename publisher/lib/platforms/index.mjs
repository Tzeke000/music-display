import youtube from './youtube.mjs';
import x from './x.mjs';
import instagram from './instagram.mjs';
import tiktok from './tiktok.mjs';
import mock from './mock.mjs';

export const PLATFORMS = { youtube, x, instagram, tiktok, mock };

export function getPlatform(id) {
  const p = PLATFORMS[id];
  if (!p) {
    throw new Error(`Unknown platform "${id}". Known: ${Object.keys(PLATFORMS).join(', ')}`);
  }
  return p;
}
