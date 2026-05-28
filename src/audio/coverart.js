/**
 * Minimal, dependency-free embedded cover-art extractor for MP3 (ID3v2.3/2.4).
 * Reads APIC frames and returns a Blob for the first usable picture, or null.
 * WAV files almost never carry cover art, so we just return null for those.
 *
 * This avoids pulling a heavyweight metadata library (and its Node polyfills)
 * into the browser bundle for what is a small, well-specified binary format.
 */
export async function extractCoverArt(file) {
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    if (buf.length < 10) return null;
    // ID3v2 header: "ID3" + version(2) + flags(1) + size(4, syncsafe)
    if (buf[0] !== 0x49 || buf[1] !== 0x44 || buf[2] !== 0x33) return null;
    const major = buf[3];
    const tagSize = synchsafe(buf[6], buf[7], buf[8], buf[9]);
    const end = Math.min(buf.length, 10 + tagSize);

    let p = 10;
    while (p + 10 <= end) {
      const id = String.fromCharCode(buf[p], buf[p + 1], buf[p + 2], buf[p + 3]);
      // Frame size encoding changed between 2.3 (plain) and 2.4 (syncsafe).
      const size = major >= 4
        ? synchsafe(buf[p + 4], buf[p + 5], buf[p + 6], buf[p + 7])
        : (buf[p + 4] << 24) | (buf[p + 5] << 16) | (buf[p + 6] << 8) | buf[p + 7];
      if (size <= 0 || p + 10 + size > end) break;

      if (id === 'APIC') {
        const pic = parseAPIC(buf, p + 10, size);
        if (pic) return pic;
      }
      p += 10 + size;
    }
    return null;
  } catch {
    return null;
  }
}

function synchsafe(a, b, c, d) {
  return ((a & 0x7f) << 21) | ((b & 0x7f) << 14) | ((c & 0x7f) << 7) | (d & 0x7f);
}

function parseAPIC(buf, start, size) {
  let p = start;
  const enc = buf[p++]; // text encoding byte
  // MIME type: null-terminated ASCII
  let mime = '';
  while (p < start + size && buf[p] !== 0) mime += String.fromCharCode(buf[p++]);
  p++; // skip null
  p++; // picture type byte
  // Description: terminated by null(s) depending on encoding
  if (enc === 1 || enc === 2) {
    while (p + 1 < start + size && !(buf[p] === 0 && buf[p + 1] === 0)) p += 2;
    p += 2;
  } else {
    while (p < start + size && buf[p] !== 0) p++;
    p++;
  }
  const imgBytes = buf.slice(p, start + size);
  if (imgBytes.length === 0) return null;
  return new Blob([imgBytes], { type: mime || 'image/jpeg' });
}
