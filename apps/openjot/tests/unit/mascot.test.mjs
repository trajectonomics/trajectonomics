import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { loadSavedMascot, saveMascot } from "../../src/lib/mascot.ts";

// mascot.ts reads the browser globals when it is called, so a tiny fake is enough.
// The Android bridge is added per test; without it the app runs on the desktop build.
const store = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  },
};

beforeEach(() => {
  store.clear();
  delete globalThis.window.MooJotAndroid;
});

test("a saved mascot wins over the theme", () => {
  store.set("moojot_theme", "pink-white");
  store.set("openjot_mascot", "robot");
  assert.equal(loadSavedMascot(), "robot");

  store.set("moojot_theme", "trajectonomics");
  store.set("openjot_mascot", "moo");
  assert.equal(loadSavedMascot(), "moo");
});

test("with no saved mascot, the theme decides: Trajectonomics shows the robot", () => {
  store.set("moojot_theme", "trajectonomics");
  assert.equal(loadSavedMascot(), "robot");
});

test("Pink & White and Black & Orange keep Moo", () => {
  for (const theme of ["pink-white", "orange-black"]) {
    store.set("moojot_theme", theme);
    assert.equal(loadSavedMascot(), "moo", theme);
  }
});

test("an unknown saved mascot falls back to the theme rule", () => {
  for (const value of ["", "pig", "ROBOT", "robot ", "null"]) {
    store.set("openjot_mascot", value);
    store.set("moojot_theme", "pink-white");
    assert.equal(loadSavedMascot(), "moo", JSON.stringify(value));
    store.set("moojot_theme", "trajectonomics");
    assert.equal(loadSavedMascot(), "robot", JSON.stringify(value));
  }
});

test("saving writes openjot_mascot and hands it to the Android bridge", () => {
  const calls = [];
  globalThis.window.MooJotAndroid = { setMascot: (mascot) => calls.push(mascot) };

  saveMascot("moo");
  assert.equal(store.get("openjot_mascot"), "moo");
  saveMascot("robot");
  assert.equal(store.get("openjot_mascot"), "robot");
  assert.deepEqual(calls, ["moo", "robot"]);
});

test("saving does not throw when the Android bridge is absent", () => {
  assert.doesNotThrow(() => saveMascot("robot"));
  assert.equal(store.get("openjot_mascot"), "robot");

  // An older bridge without the method is just as harmless.
  globalThis.window.MooJotAndroid = { hasGalleryPermission: () => true };
  assert.doesNotThrow(() => saveMascot("moo"));
  assert.equal(store.get("openjot_mascot"), "moo");
});
