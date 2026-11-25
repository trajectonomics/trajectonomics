import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { loadSavedTheme, saveTheme, themeAttribute } from "../../src/lib/theme.ts";

// theme.ts reads the browser globals when it is called, so a tiny fake is enough.
const store = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  },
};
globalThis.document = { documentElement: { dataset: {} } };

beforeEach(() => {
  store.clear();
  globalThis.document.documentElement.dataset = {};
});

test("a fresh install defaults to the Trajectonomics theme", () => {
  assert.equal(loadSavedTheme(), "trajectonomics");
});

test("pink and orange choices survive, and Trajectonomics is saved too", () => {
  store.set("moojot_theme", "pink-white");
  assert.equal(loadSavedTheme(), "pink-white");
  store.set("moojot_theme", "orange-black");
  assert.equal(loadSavedTheme(), "orange-black");
  store.set("moojot_theme", "trajectonomics");
  assert.equal(loadSavedTheme(), "trajectonomics");
});

test("an unknown saved value falls back to Trajectonomics", () => {
  for (const value of ["", "dark", "light", "pink", "null"]) {
    store.set("moojot_theme", value);
    assert.equal(loadSavedTheme(), "trajectonomics", JSON.stringify(value));
  }
});

test("the theme id maps onto the html attribute the CSS paints with", () => {
  assert.equal(themeAttribute("trajectonomics"), "dark");
  assert.equal(themeAttribute("pink-white"), "pink-white");
  assert.equal(themeAttribute("orange-black"), "orange-black");
});

test("saving keeps the old key and paints the mapped attribute", () => {
  saveTheme("trajectonomics");
  assert.equal(store.get("moojot_theme"), "trajectonomics");
  assert.equal(globalThis.document.documentElement.dataset.theme, "dark");

  saveTheme("pink-white");
  assert.equal(store.get("moojot_theme"), "pink-white");
  assert.equal(globalThis.document.documentElement.dataset.theme, "pink-white");
});
