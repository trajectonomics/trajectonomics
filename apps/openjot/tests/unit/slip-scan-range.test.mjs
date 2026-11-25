// Regression test for #71: "Scan 1 year" imported only about 3 months of slips.
//
// The album scan walks MediaStore newest first. MainActivity passed `limit = 80`, so the
// scan stopped after 80 photos and never reached older months, yet the app then marked
// every month in the range as scanned. The Kotlin scanner has no JVM test setup in CI, so
// this test reads its source and fails if a photo cap comes back.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ANDROID = "../../src-tauri/gen/android/app/src/main/java/app/moojot/android/";
const read = (file) => readFileSync(new URL(ANDROID + file, import.meta.url), "utf8");

/** The text of `fun name(...)` up to its closing brace, found by brace counting. */
function functionBody(source, name) {
  const start = source.indexOf(`fun ${name}(`);
  assert.ok(start >= 0, `fun ${name} not found`);
  let depth = 0;
  for (let i = source.indexOf("{", source.indexOf(")", start)); i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`fun ${name} has no closing brace`);
}

test("the album scan has no cap on how many photos it reads", () => {
  const scan = functionBody(read("MooJotScanner.kt"), "scanBankAlbums");
  const signature = scan.slice(0, scan.indexOf("{"));
  assert.doesNotMatch(signature, /\blimit\s*:/, "scanBankAlbums takes a photo limit again");
  const loop = /while\s*\(([^)]*\([^)]*\)[^)]*|[^)]*)\)\s*\{/.exec(scan.slice(scan.indexOf("cursor.use")));
  assert.ok(loop, "the cursor loop was not found");
  assert.equal(loop[1].replace(/\s+/g, ""), "c.moveToNext()", "the cursor loop stops early on another condition");
});

test("the bridge scans the whole range it is given", () => {
  const bridge = functionBody(read("MainActivity.kt"), "scanBankSlips");
  const call = bridge.slice(bridge.indexOf("MooJotScanner.scanBankAlbums("));
  assert.ok(call.length > 0, "scanBankSlips no longer calls MooJotScanner.scanBankAlbums");
  assert.doesNotMatch(call.slice(0, call.indexOf(")")), /\blimit\s*=/, "scanBankSlips passes a photo limit again");
});
