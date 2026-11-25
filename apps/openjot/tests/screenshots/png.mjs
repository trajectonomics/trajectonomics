// Minimal PNG read/write and pixel diff, so the screenshot test needs no image
// library. Reads what Chrome's Page.captureScreenshot produces: 8-bit RGB or
// RGBA, not interlaced. Always writes 8-bit RGBA.

import { crc32, deflateSync, inflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** @returns {{ width: number, height: number, data: Buffer }} RGBA pixels, 4 bytes each. */
export function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error("not a PNG file");
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat = [];
  for (let offset = 8; offset < buffer.length; ) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("latin1", offset + 4, offset + 8);
    const body = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const [bitDepth, colorType, , , interlace] = body.subarray(8);
      if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6) || interlace !== 0) {
        throw new Error(`unsupported PNG (bit depth ${bitDepth}, color type ${colorType}, interlace ${interlace})`);
      }
      channels = colorType === 6 ? 4 : 3;
    } else if (type === "IDAT") {
      idat.push(body);
    } else if (type === "IEND") {
      break;
    }
    offset += 12 + length;
  }
  if (!width || !height) throw new Error("PNG has no IHDR chunk");

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  if (raw.length !== (stride + 1) * height) throw new Error("PNG pixel data has the wrong length");

  // Undo the per-row filters in place. `line` is the current row, `prev` the row above.
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const rowStart = y * (stride + 1) + 1;
    const out = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? pixels[out + x - channels] : 0;
      const up = y > 0 ? pixels[out + x - stride] : 0;
      const upLeft = y > 0 && x >= channels ? pixels[out + x - stride - channels] : 0;
      let value = raw[rowStart + x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) value += paeth(left, up, upLeft);
      else if (filter !== 0) throw new Error(`unknown PNG filter ${filter}`);
      pixels[out + x] = value & 0xff;
    }
  }

  if (channels === 4) return { width, height, data: pixels };
  const data = Buffer.alloc(width * height * 4, 0xff);
  for (let i = 0, j = 0; i < pixels.length; i += 3, j += 4) {
    data[j] = pixels[i];
    data[j + 1] = pixels[i + 1];
    data[j + 2] = pixels[i + 2];
  }
  return { width, height, data };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/** Encodes RGBA pixels as a PNG file. */
export function encodePng({ width, height, data }) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    // Filter 0 (none) for every row: simple, and deflate still does well on flat UI.
    data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([SIGNATURE, chunk("IHDR", header), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

function chunk(type, body) {
  const out = Buffer.alloc(12 + body.length);
  out.writeUInt32BE(body.length, 0);
  out.write(type, 4, "latin1");
  body.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + body.length)), 8 + body.length);
  return out;
}

/**
 * Compares two decoded images.
 *
 * A pixel counts as different when any of its channels is more than
 * `channelTolerance` (0-255) away from the baseline. The result carries a diff
 * image: the new screenshot faded to grey with the different pixels in magenta.
 *
 * @returns {{ sameSize: boolean, differentPixels: number, totalPixels: number, diff: { width: number, height: number, data: Buffer } | null }}
 */
export function diffImages(expected, actual, channelTolerance) {
  const totalPixels = expected.width * expected.height;
  if (expected.width !== actual.width || expected.height !== actual.height) {
    return { sameSize: false, differentPixels: totalPixels, totalPixels, diff: null };
  }
  const a = expected.data;
  const b = actual.data;
  const out = Buffer.alloc(b.length);
  let differentPixels = 0;
  for (let i = 0; i < b.length; i += 4) {
    const different =
      Math.abs(a[i] - b[i]) > channelTolerance ||
      Math.abs(a[i + 1] - b[i + 1]) > channelTolerance ||
      Math.abs(a[i + 2] - b[i + 2]) > channelTolerance ||
      Math.abs(a[i + 3] - b[i + 3]) > channelTolerance;
    if (different) {
      differentPixels += 1;
      out[i] = 0xff;
      out[i + 1] = 0x00;
      out[i + 2] = 0xc8;
    } else {
      // Luma, pushed three quarters of the way to white so the magenta stands out.
      const grey = 191 + ((b[i] * 77 + b[i + 1] * 150 + b[i + 2] * 29) >> 10);
      out[i] = out[i + 1] = out[i + 2] = grey;
    }
    out[i + 3] = 0xff;
  }
  return { sameSize: true, differentPixels, totalPixels, diff: { width: actual.width, height: actual.height, data: out } };
}
