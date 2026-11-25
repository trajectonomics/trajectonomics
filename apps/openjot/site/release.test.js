// Run with: node --test site/release.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { ARCHIVED_REPO, handle, pickRelease, RELEASES_URL, REPO, TAG_PREFIX } from "./release.js";

const asset = (name, size = 1000, tag = "openjot-v1.0.0", repo = REPO) => ({
  name,
  size,
  browser_download_url: `https://github.com/${repo}/releases/download/${tag}/${name}`,
});

const release = (assets, tag = "openjot-v1.0.0", extra = {}) => ({
  tag_name: tag,
  draft: false,
  prerelease: false,
  published_at: "2026-11-22T00:00:00Z",
  html_url: `https://github.com/${REPO}/releases/tag/${tag}`,
  assets,
  ...extra,
});

const API_LIST = `https://api.github.com/repos/${REPO}/releases?per_page=100`;
const WEB_LIST = `https://github.com/${REPO}/releases?q=${encodeURIComponent(TAG_PREFIX)}`;
const ARCHIVED_API = `https://api.github.com/repos/${ARCHIVED_REPO}/releases/latest`;
const ARCHIVED_LATEST = `https://github.com/${ARCHIVED_REPO}/releases/latest`;

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
const req = (path) => new Request(`https://openjot.trajectonomics.com${path}`);

function routes(table) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push(url);
    for (const [prefix, make] of table) if (url.startsWith(prefix)) return make(url, init);
    return new Response("not found", { status: 404 });
  };
  return { fetch, calls };
}

test("pickRelease prefers the universal APK and finds the checksums", () => {
  const picked = pickRelease(
    release([asset("app-arm64-release.apk"), asset("app-universal-release.apk", 4200), asset("SHA256SUMS"), asset("app.aab")]),
  );
  assert.equal(picked.version, "openjot-v1.0.0");
  assert.equal(picked.apk.name, "app-universal-release.apk");
  assert.equal(picked.apk.size, 4200);
  assert.match(picked.checksumsUrl, /SHA256SUMS$/);
});

test("pickRelease picks the APK, never the AAB, from the real assets", () => {
  const picked = pickRelease(
    release([
      asset("moojot-android-arm64.apk", 52653181),
      asset("moojot-android-arm64.aab", 48000000),
      asset("SHA256SUMS", 200),
    ]),
  );
  assert.equal(picked.version, "openjot-v1.0.0");
  assert.equal(picked.apk.name, "moojot-android-arm64.apk");
  assert.equal(picked.apk.size, 52653181);
  assert.equal(
    picked.apk.url,
    "https://github.com/trajectonomics/trajectonomics/releases/download/openjot-v1.0.0/moojot-android-arm64.apk",
  );
  assert.equal(
    picked.checksumsUrl,
    "https://github.com/trajectonomics/trajectonomics/releases/download/openjot-v1.0.0/SHA256SUMS",
  );
});

test("pickRelease returns null for no APK, a draft, a prerelease or nothing", () => {
  assert.equal(pickRelease(release([asset("app.aab"), asset("SHA256SUMS")])), null);
  assert.equal(pickRelease(release([asset("a.apk")], "openjot-v1.0.0", { draft: true })), null);
  assert.equal(pickRelease(release([asset("a.apk")], "openjot-v1.0.0", { prerelease: true })), null);
  assert.equal(pickRelease(null), null);
});

test("the newest openjot-v* release wins over newer cli-v* releases", async () => {
  const gh = github(200, [
    release([asset("cli.apk")], "cli-v0.8.0"),
    release([asset("moojot-android-arm64.apk", 1000, "openjot-v1.4.0")], "openjot-v1.4.0"),
    release([asset("old.apk")], "openjot-v1.3.0"),
  ]);
  const res = await handle(req("/download"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(
    res.headers.get("location"),
    "https://github.com/trajectonomics/trajectonomics/releases/download/openjot-v1.4.0/moojot-android-arm64.apk",
  );
});

test("drafts and prereleases are skipped, even when they are newer", async () => {
  const gh = github(200, [
    release([asset("draft.apk")], "openjot-v1.6.0", { draft: true }),
    release([asset("beta.apk")], "openjot-v1.5.0", { prerelease: true }),
    release([asset("moojot-android-arm64.apk", 1000, "openjot-v1.4.0")], "openjot-v1.4.0"),
  ]);
  const res = await handle(req("/download"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.match(res.headers.get("location"), /openjot-v1\.4\.0\/moojot-android-arm64\.apk$/);
});

test("/download falls back to the archived repository before the first openjot-v* release", async () => {
  const gh = routes([
    [API_LIST, () => Response.json([release([asset("cli.apk")], "cli-v0.8.0")])],
    [
      ARCHIVED_API,
      () =>
        Response.json(
          release([asset("moojot-android-arm64.apk", 52653181, "v1.4.0", ARCHIVED_REPO)], "v1.4.0"),
        ),
    ],
  ]);
  const res = await handle(req("/download"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(
    res.headers.get("location"),
    "https://github.com/trajectonomics/moojot/releases/download/v1.4.0/moojot-android-arm64.apk",
  );
  const api = await handle(req("/api/release"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal((await api.json()).release.version, "v1.4.0");
});

test("/download sends people to the coming-soon note when neither repository has a release", async () => {
  const gh = routes([
    [API_LIST, () => Response.json([])],
    [ARCHIVED_API, () => new Response("{}", { status: 404 })],
  ]);
  const res = await handle(req("/download"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "https://openjot.trajectonomics.com/#coming-soon");
});

test("/download falls back to the GitHub releases page when GitHub fails", async () => {
  const gh = routes([
    [API_LIST, () => new Response("{}", { status: 403 })],
    [WEB_LIST, () => new Response("", { status: 500 })],
    [ARCHIVED_API, () => new Response("{}", { status: 403 })],
    [ARCHIVED_LATEST, () => new Response("", { status: 500 })],
  ]);
  const res = await handle(req("/download"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(res.headers.get("location"), RELEASES_URL);
});

test("/download never serves the archived APK when the openjot lookup fails", async () => {
  const gh = routes([
    [API_LIST, () => new Response("{}", { status: 403 })],
    [WEB_LIST, () => new Response("", { status: 500 })],
    [
      ARCHIVED_API,
      () =>
        Response.json(
          release([asset("moojot-android-arm64.apk", 52653181, "v1.4.0", ARCHIVED_REPO)], "v1.4.0"),
        ),
    ],
  ]);
  const res = await handle(req("/download"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), RELEASES_URL);
  assert.deepEqual(
    gh.calls.filter((url) => url.includes(ARCHIVED_REPO)),
    [],
  );
});

test("/download/checksums redirects to the release's SHA256SUMS", async () => {
  const gh = github(200, [release([asset("moojot-android-arm64.apk", 1000, "openjot-v1.4.0"), asset("SHA256SUMS", 1000, "openjot-v1.4.0")], "openjot-v1.4.0")]);
  const res = await handle(req("/download/checksums"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(res.status, 302);
  assert.equal(
    res.headers.get("location"),
    "https://github.com/trajectonomics/trajectonomics/releases/download/openjot-v1.4.0/SHA256SUMS",
  );
});

test("/download/checksums follows the archived fallback too", async () => {
  const gh = routes([
    [API_LIST, () => Response.json([])],
    [
      ARCHIVED_API,
      () =>
        Response.json(
          release(
            [
              asset("moojot-android-arm64.apk", 52653181, "v1.4.0", ARCHIVED_REPO),
              asset("SHA256SUMS", 200, "v1.4.0", ARCHIVED_REPO),
            ],
            "v1.4.0",
          ),
        ),
    ],
  ]);
  const res = await handle(req("/download/checksums"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(
    res.headers.get("location"),
    "https://github.com/trajectonomics/moojot/releases/download/v1.4.0/SHA256SUMS",
  );
});

test("/download/checksums sends people to the coming-soon note when there is no release", async () => {
  const gh = routes([
    [API_LIST, () => Response.json([])],
    [ARCHIVED_API, () => new Response("{}", { status: 404 })],
  ]);
  const res = await handle(req("/download/checksums"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(res.headers.get("location"), "https://openjot.trajectonomics.com/#coming-soon");
});

test("the release lookup is cached, and errors are not", async () => {
  const cache = memoryCache();
  const failing = github(500);
  await handle(req("/api/release"), env, null, { fetch: failing.fetch, cache });
  assert.equal(cache.store.size, 0);

  const ok = github(200, [release([asset("moojot.apk")])]);
  const first = await handle(req("/api/release"), env, null, { fetch: ok.fetch, cache });
  const second = await handle(req("/api/release"), env, null, { fetch: ok.fetch, cache });
  assert.equal(ok.calls.length, 1);
  assert.equal((await first.json()).release.apk.name, "moojot.apk");
  assert.equal((await second.json()).release.apk.name, "moojot.apk");
});

test("/api/release answers 503 when GitHub is unavailable", async () => {
  const gh = routes([
    [API_LIST, () => new Response("{}", { status: 403 })],
    [WEB_LIST, () => new Response("", { status: 500 })],
    [ARCHIVED_API, () => new Response("{}", { status: 403 })],
    [ARCHIVED_LATEST, () => new Response("", { status: 500 })],
  ]);
  const res = await handle(req("/api/release"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { release: null, error: "unavailable" });
});

test("other paths are served from static assets", async () => {
  const res = await handle(req("/"), env, null, {});
  assert.equal(await res.text(), "asset");
});

test("the old host answers 301 to the new host, keeping the path and query", async () => {
  const res = await handle(
    new Request("https://moojot.trajectonomics.com/download/ig?x=1"),
    env,
    null,
    {},
  );
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), "https://openjot.trajectonomics.com/download/ig?x=1");
});

test("the old host redirects the comparison page, and the new host serves it from assets", async () => {
  const old = await handle(
    new Request("https://moojot.trajectonomics.com/meowjot-alternative"),
    env,
    null,
    {},
  );
  assert.equal(old.status, 301);
  assert.equal(old.headers.get("location"), "https://openjot.trajectonomics.com/meowjot-alternative");

  const calls = [];
  const assets = {
    fetch: async (request) => {
      calls.push(request.url);
      return new Response("asset");
    },
  };
  const res = await handle(
    new Request("https://openjot.trajectonomics.com/meowjot-alternative"),
    { ASSETS: assets },
    null,
    {},
  );
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "asset");
  assert.deepEqual(calls, ["https://openjot.trajectonomics.com/meowjot-alternative"]);
});

test("the old host still proxies /ingest events instead of redirecting them", async () => {
  const calls = [];
  const fetch = async (url) => {
    calls.push(url);
    return new Response("{}", { status: 200 });
  };
  const res = await handle(
    new Request("https://moojot.trajectonomics.com/ingest/e/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }),
    env,
    null,
    { fetch },
  );
  assert.equal(res.status, 200);
  assert.deepEqual(calls, ["https://eu.i.posthog.com/e/"]);
});

test("the old host still proxies /ingest scripts instead of redirecting them", async () => {
  const calls = [];
  const fetch = async (url) => {
    calls.push(url);
    return new Response("// posthog", { status: 200 });
  };
  const res = await handle(
    new Request("https://moojot.trajectonomics.com/ingest/static/array.js"),
    env,
    null,
    { fetch },
  );
  assert.notEqual(res.status, 301);
  assert.deepEqual(calls, ["https://eu-assets.i.posthog.com/static/array.js"]);
});

test("the new host serves the landing page normally", async () => {
  const res = await handle(
    new Request("https://openjot.trajectonomics.com/"),
    env,
    null,
    {},
  );
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "asset");
});

test("when the API is rate limited, /download reads the release list from github.com", async () => {
  const tag = "openjot-v1.4.0";
  const gh = routes([
    [API_LIST, () => new Response("{}", { status: 403 })],
    [
      WEB_LIST,
      () => new Response(
        `<a href="/${REPO}/releases/tag/${tag}">${tag}</a>` +
        `<a href="/${REPO}/releases/tag/cli-v0.8.0">cli-v0.8.0</a>`,
      ),
    ],
    [`https://github.com/${REPO}/releases/tag/${tag}`, () => new Response("<span>Latest</span>")],
    [
      `https://github.com/${REPO}/releases/expanded_assets/${tag}`,
      () => new Response(
        `<a href="/${REPO}/releases/download/${tag}/moojot-android-arm64.apk">apk</a>` +
        `<a href="/${REPO}/releases/download/${tag}/SHA256SUMS">sums</a>` +
        `<a href="/${REPO}/archive/refs/tags/${tag}.zip">zip</a>`,
      ),
    ],
  ]);
  const res = await handle(req("/download"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(
    res.headers.get("location"),
    `https://github.com/${REPO}/releases/download/${tag}/moojot-android-arm64.apk`,
  );
  const api = await handle(req("/api/release"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  const { release: found } = await api.json();
  assert.equal(found.version, tag);
  assert.equal(found.apk.size, null);
  assert.match(found.checksumsUrl, /openjot-v1\.4\.0\/SHA256SUMS$/);
});

test("the github.com fallback skips a prerelease and takes the next tag", async () => {
  const beta = "openjot-v1.5.0";
  const stable = "openjot-v1.4.0";
  const gh = routes([
    [API_LIST, () => new Response("{}", { status: 403 })],
    [
      WEB_LIST,
      () => new Response(
        `<a href="/${REPO}/releases/tag/${beta}">${beta}</a>` +
        `<a href="/${REPO}/releases/tag/${stable}">${stable}</a>`,
      ),
    ],
    [`https://github.com/${REPO}/releases/tag/${beta}`, () => new Response("<span>Pre-release</span>")],
    [`https://github.com/${REPO}/releases/tag/${stable}`, () => new Response("<span>Latest</span>")],
    [
      `https://github.com/${REPO}/releases/expanded_assets/${stable}`,
      () => new Response(`<a href="/${REPO}/releases/download/${stable}/moojot-android-arm64.apk">apk</a>`),
    ],
  ]);
  const res = await handle(req("/download"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(
    res.headers.get("location"),
    `https://github.com/${REPO}/releases/download/${stable}/moojot-android-arm64.apk`,
  );
});

test("when the API is rate limited and there is no openjot release, the archived repository answers", async () => {
  const gh = routes([
    [API_LIST, () => new Response("{}", { status: 403 })],
    [WEB_LIST, () => new Response("No releases found")],
    [ARCHIVED_API, () => new Response("{}", { status: 403 })],
    [
      ARCHIVED_LATEST,
      () => new Response(null, {
        status: 302,
        headers: { location: `https://github.com/${ARCHIVED_REPO}/releases/tag/v1.4.0` },
      }),
    ],
    [
      `https://github.com/${ARCHIVED_REPO}/releases/tag/v1.4.0`,
      () => new Response("<span>Latest</span>"),
    ],
    [
      `https://github.com/${ARCHIVED_REPO}/releases/expanded_assets/v1.4.0`,
      () => new Response(`<a href="/${ARCHIVED_REPO}/releases/download/v1.4.0/moojot-android-arm64.apk">apk</a>`),
    ],
  ]);
  const res = await handle(req("/download"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(
    res.headers.get("location"),
    `https://github.com/${ARCHIVED_REPO}/releases/download/v1.4.0/moojot-android-arm64.apk`,
  );
});
