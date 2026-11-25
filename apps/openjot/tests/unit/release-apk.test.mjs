// Regression test for #45: R8 in the release build stripped code that ML Kit and
// ONNX Runtime reach by reflection or JNI, so slip OCR returned no text and every
// slip imported as 0 baht. Debug builds skip R8, so only a real release APK shows it.
//
// Run it against a built APK:
//   OPENJOT_APK=path/to/openjot-android-arm64.apk node --test tests/unit/release-apk.test.mjs
// Without OPENJOT_APK the test is skipped, because CI's unit job builds no APK.
//
// It also checks #57: every library the APK bundles has an entry in static/third-party-notices.txt.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { apkArtifacts, NATIVE_LIBS } from "../../tools/third-party-notices.mjs";

const apkPath = process.env.OPENJOT_APK;
const ONNX_JNI_LIB = "lib/arm64-v8a/libonnxruntime4j_jni.so";
const REGISTRAR_PREFIX = "com.google.firebase.components:";

// --- zip ------------------------------------------------------------------

function readZip(buf) {
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

// --- dex ------------------------------------------------------------------

function uleb(b, o) {
  let r = 0;
  let s = 0;
  for (;;) {
    const x = b[o++];
    r |= (x & 0x7f) << s;
    s += 7;
    if (x < 0x80) return [r >>> 0, o];
  }
}

/** Maps each class descriptor ("La/b/C;") to the proto strings of its constructors. */
function dexConstructors(dex) {
  const u32 = (o) => dex.readUInt32LE(o);
  const [stringCount, stringOff] = [u32(0x38), u32(0x3c)];
  const typeOff = u32(0x44);
  const protoOff = u32(0x4c);
  const methodOff = u32(0x5c);
  const [classCount, classOff] = [u32(0x60), u32(0x64)];

  const strCache = new Array(stringCount);
  const str = (i) => {
    if (strCache[i] === undefined) {
      const [, p] = uleb(dex, u32(stringOff + 4 * i));
      strCache[i] = dex.toString("utf8", p, dex.indexOf(0, p));
    }
    return strCache[i];
  };
  const type = (i) => str(u32(typeOff + 4 * i));
  const proto = (i) => {
    const base = protoOff + 12 * i;
    const ret = type(u32(base + 4));
    const params = u32(base + 8);
    let args = "";
    if (params) {
      const n = u32(params);
      for (let k = 0; k < n; k++) args += type(dex.readUInt16LE(params + 4 + 2 * k));
    }
    return `(${args})${ret}`;
  };

  const classes = new Map();
  for (let c = 0; c < classCount; c++) {
    const base = classOff + 32 * c;
    const name = type(u32(base));
    const ctors = [];
    const data = u32(base + 24);
    if (data) {
      let o = data;
      let staticFields, instanceFields, directMethods;
      [staticFields, o] = uleb(dex, o);
      [instanceFields, o] = uleb(dex, o);
      [directMethods, o] = uleb(dex, o);
      [, o] = uleb(dex, o);
      for (let k = 0; k < staticFields + instanceFields; k++) {
        [, o] = uleb(dex, o);
        [, o] = uleb(dex, o);
      }
      let idx = 0;
      for (let k = 0; k < directMethods; k++) {
        let diff;
        [diff, o] = uleb(dex, o);
        [, o] = uleb(dex, o);
        [, o] = uleb(dex, o);
        idx += diff;
        const m = methodOff + 8 * idx;
        if (str(u32(m + 4)) === "<init>") ctors.push(proto(dex.readUInt16LE(m + 2)));
      }
    }
    classes.set(name, ctors);
  }
  return classes;
}

// --- binary AndroidManifest.xml and ELF strings ----------------------------

function manifestStrings(xml) {
  const headerSize = xml.readUInt16LE(10);
  const count = xml.readUInt32LE(16);
  const utf8 = (xml.readUInt32LE(24) & 0x100) !== 0;
  const base = 8 + xml.readUInt32LE(28);
  const out = [];
  for (let i = 0; i < count; i++) {
    let p = base + xml.readUInt32LE(8 + headerSize + 4 * i);
    if (utf8) {
      p += xml[p] & 0x80 ? 2 : 1;
      let n = xml[p++];
      if (n & 0x80) n = ((n & 0x7f) << 8) | xml[p++];
      out.push(xml.toString("utf8", p, p + n));
    } else {
      const n = xml.readUInt16LE(p);
      out.push(xml.toString("utf16le", p + 2, p + 2 + 2 * n));
    }
  }
  return out;
}

function printableStrings(buf, min = 4) {
  const out = [];
  let start = -1;
  for (let i = 0; i <= buf.length; i++) {
    const c = i < buf.length ? buf[i] : 0;
    if (c >= 0x20 && c < 0x7f) {
      if (start < 0) start = i;
    } else {
      if (start >= 0 && i - start >= min) out.push(buf.toString("latin1", start, i));
      start = -1;
    }
  }
  return out;
}

// --- tests ----------------------------------------------------------------

const skip = apkPath ? false : "set OPENJOT_APK to a release APK to run this check";

test("release APK keeps what ML Kit and ONNX Runtime look up at runtime", { skip }, async (t) => {
  const zip = readZip(readFileSync(apkPath));
  const classes = new Map();
  for (const name of zip.names.filter((n) => /^classes\d*\.dex$/.test(n))) {
    for (const [cls, ctors] of dexConstructors(zip.read(name))) classes.set(cls, ctors);
  }
  const descriptor = (javaName) => `L${javaName.replaceAll(".", "/")};`;

  await t.test("every ML Kit component registrar keeps its no-arg constructor", () => {
    const registrars = manifestStrings(zip.read("AndroidManifest.xml"))
      .filter((s) => s.startsWith(REGISTRAR_PREFIX))
      .map((s) => s.slice(REGISTRAR_PREFIX.length));
    assert.ok(registrars.length > 0, "the manifest lists no component registrars");
    const broken = registrars.filter((r) => !(classes.get(descriptor(r)) ?? []).includes("()V"));
    assert.deepEqual(broken, [], "ML Kit creates these with a no-arg constructor, which R8 removed");
  });

  await t.test("every library in the APK has an entry in the third-party notices", () => {
    const notices = readFileSync(new URL("../../static/third-party-notices.txt", import.meta.url), "utf8");
    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const { versioned, clients } = apkArtifacts(zip);
    assert.ok(versioned.length > 20 && clients.length > 5, "the APK names too few libraries");
    const missing = [
      ...versioned.map((v) => ({ label: `${v.group}:${v.artifact} ${v.version}`, re: new RegExp(`^${escape(`${v.group}:${v.artifact}`)} ${escape(v.version)}(?: \\*)? - `, "m") })),
      // The properties files name the artifact and version but not the group.
      ...clients.map((c) => ({ label: `${c.artifact} ${c.version}`, re: new RegExp(`^[\\w.-]+:${escape(c.artifact)} ${escape(c.version)}(?: \\*)? - `, "m") })),
    ]
      .filter(({ re }) => !re.test(notices))
      .map(({ label }) => label);
    assert.deepEqual(missing, [], "regenerate the notices: node tools/third-party-notices.mjs --apk <this apk>");

    const nativeLibs = [...new Set(zip.names.filter((n) => /^lib\/[^/]+\/[^/]+\.so$/.test(n)).map((n) => n.split("/").pop()))];
    assert.deepEqual(nativeLibs.filter((l) => !NATIVE_LIBS[l]), [], "a native library has no notice rule in tools/third-party-notices.mjs");
  });

  await t.test("every ONNX Runtime class and constructor its JNI library uses survives", () => {
    const jni = zip.read(ONNX_JNI_LIB);
    assert.ok(jni, `${ONNX_JNI_LIB} is missing`);
    const strings = printableStrings(jni);

    const wantedClasses = [...new Set(strings.filter((s) => /^ai\/onnxruntime\/[\w$]+$/.test(s)))];
    assert.ok(wantedClasses.length > 0, "found no ai/onnxruntime class names in the JNI library");
    const missingClasses = wantedClasses.filter((c) => !classes.has(`L${c};`));
    assert.deepEqual(missingClasses, [], "classes the JNI library finds by name are gone");

    const onnxCtors = new Set(
      [...classes].filter(([cls]) => cls.startsWith("Lai/onnxruntime/")).flatMap(([, ctors]) => ctors),
    );
    const wantedCtors = [...new Set(strings.filter((s) => /^\(.*Lai\/onnxruntime\/.*\)V$/.test(s)))];
    const missingCtors = wantedCtors.filter((sig) => !onnxCtors.has(sig));
    assert.deepEqual(missingCtors, [], "constructors the JNI library calls are gone or changed");
  });
});
