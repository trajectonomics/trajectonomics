import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateTheme } from "../../src/lib/theme.ts";

test("the saved theme migrates from the retired pink/orange names", () => {
  assert.equal(migrateTheme("pink-white"), "light");
  assert.equal(migrateTheme("orange-black"), "dark");
});

test("the current theme names stay as they are", () => {
  assert.equal(migrateTheme("light"), "light");
  assert.equal(migrateTheme("dark"), "dark");
});

test("a missing or unknown choice falls back to light", () => {
  assert.equal(migrateTheme(null), "light");
  assert.equal(migrateTheme(undefined), "light");
  assert.equal(migrateTheme(""), "light");
  assert.equal(migrateTheme("sepia"), "light");
});
