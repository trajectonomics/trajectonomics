// Minimal zip (APK, AAR, JAR) and tar.gz (.crate, npm .tgz) readers built on node:zlib,
// so the notices generator needs no unzip/tar binary and no npm package.

import { gunzipSync, inflateRawSync } from "node:zlib";

/** Reads the central directory of a zip. Returns { names, read(name) }. */
export function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip file");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    entries.set(name, { method, size, local });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return {
    names: [...entries.keys()],
    read(name) {
      const e = entries.get(name);
      if (!e) return null;
      const start = e.local + 30 + buf.readUInt16LE(e.local + 26) + buf.readUInt16LE(e.local + 28);
      const raw = buf.subarray(start, start + e.size);
      return e.method === 0 ? raw : inflateRawSync(raw);
    },
  };
}

function octal(buf, start, end) {
  const s = buf.toString("latin1", start, end).replace(/\0.*$/s, "").trim();
  return s ? parseInt(s, 8) : 0;
}

/** Returns the regular files of a gzip'd tar whose path passes `want(path)`, as [{ path, data }]. */
export function readTarGz(gz, want = () => true) {
  const buf = gunzipSync(gz);
  const out = [];
  let longName = null;
  let paxPath = null;
  for (let p = 0; p + 512 <= buf.length; ) {
    if (buf.every((b) => b === 0, p, p + 512)) break;
    let name = buf.toString("utf8", p, p + 100).replace(/\0.*$/s, "");
    const prefix = buf.toString("utf8", p + 345, p + 500).replace(/\0.*$/s, "");
    if (prefix && buf.toString("latin1", p + 257, p + 262) === "ustar") name = `${prefix}/${name}`;
    const size = octal(buf, p + 124, p + 136);
    const type = String.fromCharCode(buf[p + 156] || 48);
    const dataStart = p + 512;
    const data = () => buf.subarray(dataStart, dataStart + size);
    if (type === "L") {
      longName = data().toString("utf8").replace(/\0.*$/s, "");
    } else if (type === "x") {
      const m = /(?:^|\n)\d+ path=([^\n]*)\n/.exec(data().toString("utf8"));
      if (m) paxPath = m[1];
    } else if (type === "0") {
      const path = longName ?? paxPath ?? name;
      if (want(path)) out.push({ path, data: Buffer.from(data()) });
      longName = null;
      paxPath = null;
    } else if (type !== "g") {
      longName = null;
      paxPath = null;
    }
    p = dataStart + Math.ceil(size / 512) * 512;
  }
  return out;
}
