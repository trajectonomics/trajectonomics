#!/usr/bin/env node
// Screenshot (visual regression) test. Renders each scene in scenes.mjs in
// headless Chrome at a phone viewport, with the backend faked by fixture.mjs,
// and compares the picture with the committed baseline in baseline/.
//
// Zero dependencies, same plumbing as tests/e2e (see tests/e2e/harness.mjs).
//
// Usage:  pnpm test:screenshots                  compare every scene with its baseline
//         pnpm test:screenshots home summary     only scenes whose name contains a word
//         pnpm test:screenshots:update           rewrite the baselines that changed
//         pnpm test:screenshots:update home      ... only for matching scenes
//         add --no-build to reuse an existing build/
// Env:    CHROME_BIN=/path/to/chrome   (default: google-chrome / chromium on PATH)
//
// On failure, tests/screenshots/output/ holds expected, actual and diff
// pictures for each failed scene, and report.html shows them side by side.
//
// Exit codes: 0 = all scenes match (or were updated); 1 = anything else.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { BUILD_DIR, Cdp, ROOT, buildApp, findChrome, launchChrome, serveBuild, sleep } from "../e2e/harness.mjs";
import { TIMEZONE, fixtureScript } from "./fixture.mjs";
import { decodePng, diffImages, encodePng } from "./png.mjs";
import { scenes } from "./scenes.mjs";

const DIR = join(ROOT, "tests", "screenshots");
const BASELINE_DIR = join(DIR, "baseline");
const OUTPUT_DIR = join(DIR, "output");
const META_FILE = join(BASELINE_DIR, "meta.json");

// A Pixel-sized phone, at one device pixel per CSS pixel. A real phone has
// about 2.6, but that makes the committed PNGs 2.5 times larger and catches
// nothing more.
const VIEWPORT = { width: 412, height: 915, deviceScaleFactor: 1 };

// A pixel is "different" when a channel is more than this far (0-255) from the baseline...
const CHANNEL_TOLERANCE = 4;
// ...and a scene fails when more than this many pixels are different. Keep
// both small: on one machine two runs give identical pictures, and a single
// changed digit in small text is only about 50 pixels.
const MAX_DIFFERENT_PIXELS = 4;

// Flags that take machine differences out of the rendering.
const CHROME_ARGS = [
  "--force-color-profile=srgb",
  "--font-render-hinting=none",
  "--disable-lcd-text",
  "--disable-font-subpixel-positioning",
  // Without this, Chrome repaints only the rectangle that changed (the mascot,
  // when its image loads or is stilled), and the curve edges under it come out
  // a few shades different from a full repaint. Which one a run gets depends
  // on timing, so always repaint whole tiles.
  "--disable-partial-raster",
];

const log = (...args) => console.log("[screenshots]", ...args);
const rel = (path) => relative(ROOT, path);

// ------------------------------------------------------------------- page ---

// Runs in the page: element lookup that ignores what the user can't see.
const PAGE_HELPERS = `(${function () {
  const visible = (el) =>
    !el.closest('[aria-hidden="true"], [inert]') &&
    el.getClientRects().length > 0 &&
    getComputedStyle(el).visibility !== "hidden";
  window.__shot = {
    find(selector, text) {
      for (const el of document.querySelectorAll(selector)) {
        if (!visible(el)) continue;
        if (text != null && el.textContent.replace(/\s+/g, " ").trim() !== text) continue;
        return el;
      }
      return null;
    },
    // The mascot is an animated WebP, which never holds still. Canvas drawImage
    // always paints an animation's first frame, so swap each picture for that.
    async freezeImages() {
      for (const img of document.images) {
        if (!img.complete) await new Promise((done) => {
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });
        if (img.src.startsWith("data:") || !img.naturalWidth) continue;
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext("2d").drawImage(img, 0, 0);
        img.src = canvas.toDataURL("image/png");
        await img.decode();
      }
    },
  };
}.toString()})();`;

class Page {
  constructor(cdp, sessionId) {
    this.cdp = cdp;
    this.sessionId = sessionId;
    this.errors = [];
    this.listener = (msg) => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === "Runtime.exceptionThrown") {
        const details = msg.params.exceptionDetails;
        this.errors.push(`uncaught error: ${details.exception?.description ?? details.text}`);
      } else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
        this.errors.push(`console.error: ${msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ")}`);
      }
    };
    cdp.listeners.push(this.listener);
  }

  send(method, params) {
    return this.cdp.send(method, params, this.sessionId);
  }

  async evaluate(expression) {
    const { result, exceptionDetails } = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (exceptionDetails) throw new Error(`page error: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
    return result.value;
  }

  async #until(expression, what, timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;
    while (!(await this.evaluate(expression))) {
      if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
      await sleep(50);
    }
  }

  #find(selector, text) {
    return `window.__shot.find(${JSON.stringify(selector)}, ${text == null ? "null" : JSON.stringify(text)})`;
  }

  waitFor(selector) {
    return this.#until(`!!${this.#find(selector)}`, `"${selector}" to be visible`);
  }

  waitForText(text, selector = "button") {
    return this.#until(`!!${this.#find(selector, text)}`, `"${text}" to be visible`);
  }

  async click(selector) {
    await this.waitFor(selector);
    await this.evaluate(`${this.#find(selector)}.click()`);
  }

  /** Clicks the visible element whose whole text is `text`. A click on a child bubbles to its button. */
  async clickText(text, selector = "button") {
    await this.waitForText(text, selector);
    await this.evaluate(`${this.#find(selector, text)}.click()`);
  }

  async fill(selector, value) {
    await this.waitFor(selector);
    await this.evaluate(`(() => {
      const el = ${this.#find(selector)};
      el.value = ${JSON.stringify(value)};
      el.dispatchEvent(new Event("input", { bubbles: true }));
    })()`);
  }

  /** Waits for fonts, stills the images, then captures until two captures in a row are the same picture. */
  async screenshot() {
    const capture = async () => {
      await this.evaluate(`(async () => {
        await document.fonts.ready;
        await window.__shot.freezeImages();
        await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      })()`);
      const { data } = await this.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      return Buffer.from(data, "base64");
    };
    let previous = await capture();
    for (let attempt = 0; attempt < 25; attempt += 1) {
      await sleep(120);
      const next = await capture();
      if (next.equals(previous)) return next;
      previous = next;
    }
    throw new Error("the screen never stopped changing (an animation or timer is still running)");
  }

  dispose() {
    this.cdp.listeners = this.cdp.listeners.filter((l) => l !== this.listener);
  }
}

async function captureScene(cdp, baseUrl, scene) {
  // A browser context per scene: no storage or cache state leaks between scenes.
  const { browserContextId } = await cdp.send("Target.createBrowserContext");
  let page;
  try {
    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank", browserContextId });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    page = new Page(cdp, sessionId);

    await page.send("Page.enable");
    await page.send("Runtime.enable");
    await page.send("Emulation.setDeviceMetricsOverride", { ...VIEWPORT, mobile: true });
    await page.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    await page.send("Emulation.setFocusEmulationEnabled", { enabled: true });
    await page.send("Emulation.setTimezoneOverride", { timezoneId: TIMEZONE });
    await page.send("Emulation.setLocaleOverride", { locale: "en-US" });
    await page.send("Emulation.setEmulatedMedia", {
      features: [
        { name: "prefers-reduced-motion", value: "reduce" },
        { name: "prefers-color-scheme", value: "light" },
      ],
    });
    await page.send("Page.addScriptToEvaluateOnNewDocument", { source: fixtureScript(scene.fixture) });
    await page.send("Page.addScriptToEvaluateOnNewDocument", { source: PAGE_HELPERS });

    const loaded = cdp.waitFor("Page.loadEventFired", sessionId);
    await page.send("Page.navigate", { url: baseUrl });
    await loaded;

    await page.waitFor(scene.ready ?? "[data-swipe-row]");
    await scene.run?.(page);
    const png = await page.screenshot();

    const unmocked = await page.evaluate("[...new Set(window.__moojotUnmocked ?? [])]");
    if (unmocked.length) {
      throw new Error(`the app called commands the fixture does not know: ${unmocked.join(", ")} (add them to tests/screenshots/fixture.mjs)`);
    }
    if (page.errors.length) throw new Error(page.errors.join("; "));
    return png;
  } finally {
    page?.dispose();
    await cdp.send("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  }
}

// ----------------------------------------------------------------- report ---

function writeReport(failed) {
  const cards = failed
    .map(({ name, reason, files }) => {
      const pictures = ["expected", "actual", "diff"]
        .filter((kind) => files[kind])
        .map((kind) => `<figure><figcaption>${kind}</figcaption><a href="${files[kind]}"><img src="${files[kind]}" alt="${name} ${kind}"></a></figure>`)
        .join("");
      return `<section><h2>${name}</h2><p>${escapeHtml(reason)}</p><div class="row">${pictures}</div></section>`;
    })
    .join("\n");
  const html = `<!doctype html>
<meta charset="utf-8">
<title>moojot screenshot diffs</title>
<style>
  body { font: 14px/1.5 system-ui, sans-serif; margin: 24px; background: #f4f4f5; color: #18181b; }
  section { background: #fff; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; }
  h2 { margin: 0 0 4px; font-size: 16px; } p { margin: 0 0 12px; color: #b91c1c; }
  .row { display: flex; gap: 16px; flex-wrap: wrap; } figure { margin: 0; }
  figcaption { font-weight: 600; margin-bottom: 4px; } img { width: 309px; border: 1px solid #d4d4d8; display: block; }
</style>
<h1>${failed.length} screenshot${failed.length === 1 ? "" : "s"} differ</h1>
${cards}
`;
  writeFileSync(join(OUTPUT_DIR, "report.html"), html);
}

const escapeHtml = (text) => text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

// ------------------------------------------------------------------- main ---

function readMeta() {
  try {
    return JSON.parse(readFileSync(META_FILE, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const update = args.includes("--update");
  const filters = args.filter((arg) => !arg.startsWith("--"));
  const unknown = args.filter((arg) => arg.startsWith("--") && !["--update", "--no-build"].includes(arg));
  if (unknown.length) {
    log(`FAIL: unknown option ${unknown.join(", ")}`);
    return 1;
  }

  const names = scenes.map((scene) => scene.name);
  const repeated = names.filter((name, index) => names.indexOf(name) !== index);
  if (repeated.length) {
    log(`FAIL: scene names must be unique; repeated: ${[...new Set(repeated)].join(", ")}`);
    return 1;
  }
  const selected = filters.length ? scenes.filter((scene) => filters.some((f) => scene.name.includes(f))) : scenes;
  if (!selected.length) {
    log(`FAIL: no scene matches ${filters.join(", ")}. Scenes: ${names.join(", ")}`);
    return 1;
  }

  const chromeBin = findChrome();
  if (!chromeBin) {
    log(
      process.env.CHROME_BIN
        ? `FAIL: CHROME_BIN=${process.env.CHROME_BIN} does not exist.`
        : "FAIL: no Chrome/Chromium found on PATH. Set CHROME_BIN to run the screenshot test.",
    );
    return 1;
  }

  if (!args.includes("--no-build") || !existsSync(join(BUILD_DIR, "index.html"))) {
    log("building with vite...");
    if (!buildApp()) {
      log("FAIL: vite build failed");
      return 1;
    }
  }

  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(BASELINE_DIR, { recursive: true });

  const chrome = launchChrome(chromeBin, CHROME_ARGS);
  const { server, url } = await serveBuild();
  let cdp;
  const failed = [];
  const counts = { same: 0, written: 0 };
  let environment;
  try {
    cdp = await Cdp.connect(await chrome.endpoint);
    const { product } = await cdp.send("Browser.getVersion");
    environment = { chrome: product.split("/")[1] ?? product, platform: process.platform };
    log(`browser: ${chromeBin} (${environment.chrome}), ${selected.length} scene${selected.length === 1 ? "" : "s"}`);

    const fail = (name, reason, pictures = {}) => {
      mkdirSync(OUTPUT_DIR, { recursive: true });
      const files = {};
      for (const [kind, buffer] of Object.entries(pictures)) {
        if (!buffer) continue;
        files[kind] = `${name}.${kind}.png`;
        writeFileSync(join(OUTPUT_DIR, files[kind]), buffer);
      }
      failed.push({ name, reason, files });
      log(`  FAIL ${name}: ${reason}`);
    };

    for (const scene of selected) {
      const baselineFile = join(BASELINE_DIR, `${scene.name}.png`);
      const baseline = existsSync(baselineFile) ? readFileSync(baselineFile) : null;

      let actual;
      try {
        actual = await captureScene(cdp, url, scene);
      } catch (error) {
        fail(scene.name, `could not capture: ${error.message}`, { expected: baseline });
        continue;
      }

      // Same picture within tolerance? Then it passes, and an update leaves the file alone.
      let problem = "no baseline yet";
      let diffPng = null;
      if (baseline) {
        if (baseline.equals(actual)) {
          problem = null;
        } else {
          const expectedImage = decodePng(baseline);
          const actualImage = decodePng(actual);
          const result = diffImages(expectedImage, actualImage, CHANNEL_TOLERANCE);
          if (!result.sameSize) {
            problem = `size changed from ${expectedImage.width}x${expectedImage.height} to ${actualImage.width}x${actualImage.height}`;
          } else if (result.differentPixels > MAX_DIFFERENT_PIXELS) {
            const percent = ((result.differentPixels / result.totalPixels) * 100).toFixed(2);
            problem = `${result.differentPixels} pixels differ (${percent}%)`;
            diffPng = encodePng(result.diff);
          } else {
            problem = null;
          }
        }
      }

      if (!problem) {
        counts.same += 1;
      } else if (update) {
        writeFileSync(baselineFile, actual);
        counts.written += 1;
        log(`  wrote ${rel(baselineFile)} (${problem})`);
      } else {
        fail(scene.name, problem, { expected: baseline, actual, diff: diffPng });
      }
    }
  } finally {
    cdp?.close();
    chrome.close();
    server.close();
  }

  // Baselines whose scene is gone. Only judged on a full run.
  if (!filters.length) {
    const known = new Set(scenes.map((scene) => `${scene.name}.png`));
    for (const file of readdirSync(BASELINE_DIR).filter((f) => f.endsWith(".png") && !known.has(f))) {
      if (update) {
        rmSync(join(BASELINE_DIR, file));
        log(`  removed ${rel(join(BASELINE_DIR, file))} (no scene uses it)`);
      } else {
        failed.push({ name: file, reason: "baseline has no scene; run pnpm test:screenshots:update to remove it", files: {} });
        log(`  FAIL ${file}: baseline has no scene`);
      }
    }
  }

  const meta = readMeta();
  const sameEnvironment = meta && meta.chrome === environment.chrome && meta.platform === environment.platform;
  if (update && !failed.length && (counts.written || !meta) && (!filters.length || !meta || sameEnvironment)) {
    writeFileSync(META_FILE, `${JSON.stringify({ ...environment, viewport: VIEWPORT }, null, 2)}\n`);
  }

  if (failed.length) {
    if (failed.some((f) => Object.keys(f.files).length)) {
      writeReport(failed);
      log(`see ${rel(join(OUTPUT_DIR, "report.html"))} for expected / actual / diff pictures`);
    }
    if (meta && !sameEnvironment) {
      log(`note: the baselines were made with Chrome ${meta.chrome} on ${meta.platform}; this is Chrome ${environment.chrome} on ${environment.platform}.`);
      log("      Another browser version or machine can render text slightly differently. CI makes the baselines:");
      log("      push, and if the Screenshots job fails, take its screenshot-baselines artifact (tests/screenshots/README.md).");
    }
    log(`FAIL: ${failed.length} of ${selected.length} scene${selected.length === 1 ? "" : "s"} failed. If the change is intended, run pnpm test:screenshots:update and commit the new baselines.`);
    return 1;
  }

  if (update) log(`PASS: ${counts.written} baseline${counts.written === 1 ? "" : "s"} written, ${counts.same} unchanged.`);
  else log(`PASS: ${counts.same} scene${counts.same === 1 ? "" : "s"} match their baselines.`);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    log(`FAIL: ${error.stack ?? error}`);
    process.exit(1);
  },
);
