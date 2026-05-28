/** Image loading + pixel sampling helpers. */

/** Load a File/Blob/URL into an HTMLImageElement (usable as a texture). */
export function loadImage(fileOrUrl) {
  const url = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image.'));
    img.src = url;
  });
}

/**
 * Draw the image into an offscreen canvas at `cols x rows` and return the raw
 * RGBA pixel data. Used to turn a picture into a particle grid.
 */
export function sampleGrid(img, cols, rows) {
  const c = document.createElement('canvas');
  c.width = cols;
  c.height = rows;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, cols, rows);
  return ctx.getImageData(0, 0, cols, rows).data; // Uint8ClampedArray RGBA
}

/**
 * Heuristic "busyness" score in 0..1 based on local color variance of a small
 * sample. High score => lots of detail (good for particles). Low score =>
 * flat/simple art (better to react as a whole image).
 */
export function detailScore(img) {
  const n = 48;
  const data = sampleGrid(img, n, n);
  let mean = 0;
  for (let i = 0; i < data.length; i += 4) mean += (data[i] + data[i + 1] + data[i + 2]) / 3;
  mean /= (data.length / 4);
  let varSum = 0;
  let edge = 0;
  let prev = -1;
  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
    varSum += (lum - mean) * (lum - mean);
    if (prev >= 0) edge += Math.abs(lum - prev);
    prev = lum;
  }
  const variance = varSum / (data.length / 4);
  const edginess = edge / (data.length / 4);
  // Normalize into a rough 0..1; tuned empirically.
  return Math.min(1, (Math.sqrt(variance) / 80) * 0.6 + (edginess / 40) * 0.4);
}
