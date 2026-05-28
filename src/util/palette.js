import { sampleGrid } from './image.js';

/**
 * Extract a small color palette from an image by quantizing pixels into a
 * coarse RGB grid and ranking buckets by population (weighted toward more
 * saturated / non-grey colors so backgrounds read as vivid, not muddy).
 *
 * Returns { colors: [{r,g,b}], a, b, dark, light } where a/b are the two most
 * dominant vivid colors, suitable for a background gradient.
 */
export function extractPalette(img) {
  const data = sampleGrid(img, 64, 64);
  const buckets = new Map();
  let darkest = { r: 255, g: 255, b: 255, lum: 999 };
  let lightest = { r: 0, g: 0, b: 0, lum: -1 };

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (lum < darkest.lum) darkest = { r, g, b, lum };
    if (lum > lightest.lum) lightest = { r, g, b, lum };

    // Quantize to 5 bits per channel.
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const weight = 1 + sat * 2; // favor saturated colors
    const e = buckets.get(key);
    if (e) { e.r += r; e.g += g; e.b += b; e.n += 1; e.w += weight; }
    else buckets.set(key, { r, g, b, n: 1, w: weight });
  }

  const ranked = [...buckets.values()]
    .map((e) => ({ r: e.r / e.n, g: e.g / e.n, b: e.b / e.n, score: e.w }))
    .sort((x, y) => y.score - x.score);

  const colors = ranked.slice(0, 5).map((c) => ({
    r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b),
  }));
  const a = colors[0] || { r: 110, g: 231, b: 255 };
  const b = colors[1] || colors[0] || { r: 176, g: 124, b: 255 };
  return {
    colors,
    a,
    b,
    dark: { r: darkest.r, g: darkest.g, b: darkest.b },
    light: { r: lightest.r, g: lightest.g, b: lightest.b },
  };
}

export const toHex = ({ r, g, b }) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
