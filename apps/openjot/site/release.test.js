// Run with: node --test site/release.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { handle, pickRelease, RELEASES_URL } from "./release.js";

const asset = (name, size = 1000) => ({
  name,
  size,
  browser_download_url: `https://github.com/trajectonomics/moojot/releases/download/v1.0.0/${name}`,
});

const release = (assets) => ({
  tag_name: "v1.0.0",
  draft: false,
  published_at: "2026-11-22T00:00:00Z",
  html_url: "https://github.com/trajectonomics/moojot/releases/tag/v1.0.0",
  assets,
});

function memoryCache() {
  const store = new Map();
  return {
    store,
    match: async (req) => store.get(req.url)?.clone(),
    put: async (req, res) => void store.set(req.url, res),
  };
}

function github(status, body) {
  const calls = [];
  const fetch = async (url) => {
    calls.push(url);
    return new Response(body === undefined ? "{}" : JSON.stringify(body), { status });
  };
  return { fetch, calls };
}

const env = { ASSETS: { fetch: async () => new Response("asset") } };
const req = (path) => new Request(`https://moojot.trajectonomics.com${path}`);

test("pickRelease prefers the universal APK and finds the checksums", () => {
  const picked = pickRelease(
    release([asset("app-arm64-release.apk"), asset("app-universal-release.apk", 4200), asset("SHA256SUMS"), asset("app.aab")]),
  );
  assert.equal(picked.version, "v1.0.0");
  assert.equal(picked.apk.name, "app-universal-release.apk");
  assert.equal(picked.apk.size, 4200);
  assert.match(picked.checksumsUrl, /SHA256SUMS$/);
});

test("pickRelease picks the APK, never the AAB, from the real v1.0.0 assets", () => {
  const picked = pickRelease(
    release([
      asset("moojot-android-arm64.apk", 52653181),
      asset("moojot-android-arm64.aab", 48000000),
      asset("SHA256SUMS", 200),
    ]),
  );
  assert.equal(picked.version, "v1.0.0");
  assert.equal(picked.apk.name, "moojot-android-arm64.apk");
  assert.equal(picked.apk.size, 52653181);
  assert.equal(
    picked.apk.url,
    "https://github.com/trajectonomics/moojot/releases/download/v1.0.0/moojot-android-arm64.apk",
  );
  assert.equal(picked.checksumsUrl, "https://github.com/trajectonomics/moojot/releases/download/v1.0.0/SHA256SUMS");
});

test("pickRelease returns null when there is no APK", () => {
  assert.equal(pickRelease(release([asset("app.aab"), asset("SHA256SUMS")])), null);
  assert.equal(pickRelease({ ...release([asset("a.apk")]), draft: true }), null);
  assert.equal(pickRelease(null), null);
});

test("/download redirects to the APK of the latest release", async () => {
  const gh = github(200, release([asset("app-universal-release.apk")]));
  const res = await handle(req("/download"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(res.status, 302);
  assert.match(res.headers.get("location"), /app-universal-release\.apk$/);
});

test("/download sends people to the coming-soon note before the first release", async () => {
  const gh = github(404, { message: "Not Found" });
  const res = await handle(req("/download"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "https://moojot.trajectonomics.com/#coming-soon");
});

test("/download falls back to the GitHub releases page when the API fails", async () => {
  const gh = github(403, { message: "rate limited" });
  const res = await handle(req("/download"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(res.headers.get("location"), RELEASES_URL);
});

test("the release lookup is cached, and errors are not", async () => {
  const cache = memoryCache();
  const failing = github(500);
  await handle(req("/api/release"), env, null, { fetch: failing.fetch, cache });
  assert.equal(cache.store.size, 0);

  const ok = github(200, release([asset("moojot.apk")]));
  const first = await handle(req("/api/release"), env, null, { fetch: ok.fetch, cache });
  const second = await handle(req("/api/release"), env, null, { fetch: ok.fetch, cache });
  assert.equal(ok.calls.length, 1);
  assert.equal((await first.json()).release.apk.name, "moojot.apk");
  assert.equal((await second.json()).release.apk.name, "moojot.apk");
});

test("/api/release answers 503 when GitHub is unavailable", async () => {
  const res = await handle(req("/api/release"), env, null, { fetch: github(502).fetch, cache: memoryCache() });
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { release: null, error: "unavailable" });
});

test("other paths are served from static assets", async () => {
  const res = await handle(req("/"), env, null, {});
  assert.equal(await res.text(), "asset");
});

function routes(table) {
  const calls = [];
  const fetch = async (url) => {
    calls.push(url);
    for (const [prefix, make] of table) if (url.startsWith(prefix)) return make();
    return new Response("not found", { status: 404 });
  };
  return { fetch, calls };
}
const API = "https://api.github.com/";
const LATEST = "https://github.com/trajectonomics/moojot/releases/latest";
const ASSETS = "https://github.com/trajectonomics/moojot/releases/expanded_assets/";

test("when the API is rate limited, /download reads the release from github.com", async () => {
  const gh = routes([
    [API, () => new Response("{}", { status: 403 })],
    [LATEST, () => new Response(null, { status: 302, headers: { location: "https://github.com/trajectonomics/moojot/releases/tag/v1.2.0" } })],
    [ASSETS + "v1.2.0", () => new Response(
      '<a href="/trajectonomics/moojot/releases/download/v1.2.0/app-universal-release.apk">apk</a>' +
      '<a href="/trajectonomics/moojot/releases/download/v1.2.0/SHA256SUMS">sums</a>' +
      '<a href="/trajectonomics/moojot/archive/refs/tags/v1.2.0.zip">zip</a>',
    )],
  ]);
  const res = await handle(req("/download"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(
    res.headers.get("location"),
    "https://github.com/trajectonomics/moojot/releases/download/v1.2.0/app-universal-release.apk",
  );
  const api = await handle(req("/api/release"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  const { release } = await api.json();
  assert.equal(release.version, "v1.2.0");
  assert.equal(release.apk.size, null);
  assert.match(release.checksumsUrl, /v1\.2\.0\/SHA256SUMS$/);
});

test("when the API is rate limited and there is no release, github.com says so too", async () => {
  const gh = routes([
    [API, () => new Response("{}", { status: 403 })],
    [LATEST, () => new Response(null, { status: 302, headers: { location: "https://github.com/trajectonomics/moojot/releases" } })],
  ]);
  const res = await handle(req("/download"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(res.headers.get("location"), "https://moojot.trajectonomics.com/#coming-soon");
});
