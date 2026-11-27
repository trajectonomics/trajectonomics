// Run with: node --test site/release.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { ARCHIVED_REPO, handle, LANDING_URL, pickRelease, RELEASES_URL, REPO } from "./release.js";

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
const WEB_REFS = `https://github.com/${REPO}.git/info/refs?service=git-upload-pack`;
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

/** A git-upload-pack ref advertisement; each tag is also listed peeled, as an annotated tag is. */
function refsAdvert(...refs) {
  const hash = (n) => n.toString(16).padStart(40, "0");
  const pkt = (text) => `${(text.length + 4).toString(16).padStart(4, "0")}${text}`;
  const lines = [
    pkt("# service=git-upload-pack\n"),
    "0000",
    pkt(`${hash(1)} HEAD\0multi_ack thin-pack side-band-64k\n`),
  ];
  refs.forEach((ref, i) => {
    lines.push(pkt(`${hash(i + 2)} ${ref}\n`));
    lines.push(pkt(`${hash(i + 2)} ${ref}^{}\n`));
  });
  lines.push("0000");
  return lines.join("");
}

const env = { ASSETS: { fetch: async () => new Response("asset") } };
const req = (path) => new Request(`https://trajectonomics.com/openjot${path}`);
const oldReq = (path, host = "moojot.trajectonomics.com") =>
  new Request(`https://${host}${path}`);

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

test("/download sends people to the landing page when neither repository has a release", async () => {
  const gh = routes([
    [API_LIST, () => Response.json([])],
    [ARCHIVED_API, () => new Response("{}", { status: 404 })],
  ]);
  const res = await handle(req("/download"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), LANDING_URL);
});

test("/download falls back to the GitHub releases page when GitHub fails", async () => {
  const gh = routes([
    [API_LIST, () => new Response("{}", { status: 403 })],
    [WEB_REFS, () => new Response("", { status: 500 })],
    [ARCHIVED_API, () => new Response("{}", { status: 403 })],
    [ARCHIVED_LATEST, () => new Response("", { status: 500 })],
  ]);
  const res = await handle(req("/download"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(res.headers.get("location"), RELEASES_URL);
});

test("/download never serves the archived APK when the openjot lookup fails", async () => {
  const gh = routes([
    [API_LIST, () => new Response("{}", { status: 403 })],
    [WEB_REFS, () => new Response("", { status: 500 })],
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

test("/download/checksums sends people to the landing page when there is no release", async () => {
  const gh = routes([
    [API_LIST, () => Response.json([])],
    [ARCHIVED_API, () => new Response("{}", { status: 404 })],
  ]);
  const res = await handle(req("/download/checksums"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(res.headers.get("location"), LANDING_URL);
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
    [WEB_REFS, () => new Response("", { status: 500 })],
    [ARCHIVED_API, () => new Response("{}", { status: 403 })],
    [ARCHIVED_LATEST, () => new Response("", { status: 500 })],
  ]);
  const res = await handle(req("/api/release"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { release: null, error: "unavailable" });
});

test("the comparison page's files, and paths outside /openjot, are served from static assets", async () => {
  for (const url of [
    "https://trajectonomics.com/openjot/meowjot-alternative/",
    "https://trajectonomics.com/openjot/meowjot-alternative/styles.css",
    "https://trajectonomics.com/blog/",
  ]) {
    const res = await handle(new Request(url), env, null, {});
    assert.equal(await res.text(), "asset", url);
  }
});

test("both old hosts answer 301 to the Site's OpenJot page for /, keeping the query", async () => {
  for (const host of ["openjot.trajectonomics.com", "moojot.trajectonomics.com"]) {
    const res = await handle(oldReq("/?utm_source=instagram", host), env, null, {});
    assert.equal(res.status, 301, host);
    assert.equal(res.headers.get("location"), `${LANDING_URL}?utm_source=instagram`);
    const head = await handle(new Request(`https://${host}/`, { method: "HEAD" }), env, null, {});
    assert.equal(head.status, 301, host);
    assert.equal(head.headers.get("location"), LANDING_URL);
  }
});

test("old short links answer 301 to the same path under /openjot, so they count once, at the new address", async () => {
  const cases = [
    ["/download/ig?x=1", "https://trajectonomics.com/openjot/download/ig?x=1"],
    ["/go/ig?x=1", "https://trajectonomics.com/openjot/go/ig?x=1"],
    ["/download", "https://trajectonomics.com/openjot/download"],
    ["/api/release", "https://trajectonomics.com/openjot/api/release"],
  ];
  for (const [path, location] of cases) {
    const res = await handle(oldReq(path), env, null, {});
    assert.equal(res.status, 301, path);
    assert.equal(res.headers.get("location"), location);
  }
});

test("the old comparison page answers 301 to its new address with a trailing slash", async () => {
  for (const path of ["/meowjot-alternative", "/meowjot-alternative.html", "/meowjot-alternative/"]) {
    const res = await handle(oldReq(path), env, null, {});
    assert.equal(res.status, 301, path);
    assert.equal(res.headers.get("location"), "https://trajectonomics.com/openjot/meowjot-alternative/");
  }
});

test("the old comparison page's files answer 301 to the same file under its new path", async () => {
  const page = "https://trajectonomics.com/openjot/meowjot-alternative/";
  for (const [path, location] of [
    ["/img/og.jpg", `${page}img/og.jpg`],
    ["/fonts/x.woff2", `${page}fonts/x.woff2`],
    ["/styles.css?v=2", `${page}styles.css?v=2`],
    ["/app.js", `${page}app.js`],
    ["/sitemap.xml", `${page}sitemap.xml`],
    ["/robots.txt", "https://trajectonomics.com/robots.txt"],
    ["/llms.txt", "https://trajectonomics.com/llms.txt"],
  ]) {
    const [pathname, query = ""] = path.split("?");
    const res = await handle(oldReq(`${pathname}${query ? `?${query}` : ""}`), env, null, {});
    assert.equal(res.status, 301, path);
    assert.equal(res.headers.get("location"), location, path);
  }
});

test("a non-GET/HEAD request on an old host answers 405 instead of forwarding it", async () => {
  const post = await handle(
    new Request("https://openjot.trajectonomics.com/download", { method: "POST", body: "x" }),
    env,
    null,
    {},
  );
  assert.equal(post.status, 405);
  assert.equal(post.headers.get("allow"), "GET, HEAD");
});

test("the comparison page is served from assets at its new address", async () => {
  const calls = [];
  const assets = {
    fetch: async (request) => {
      calls.push(request.url);
      return new Response("asset");
    },
  };
  const res = await handle(
    new Request("https://trajectonomics.com/openjot/meowjot-alternative/"),
    { ASSETS: assets },
    null,
    {},
  );
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "asset");
  assert.deepEqual(calls, ["https://trajectonomics.com/openjot/meowjot-alternative/"]);
});

test("both old hosts still proxy /ingest events instead of redirecting them", async () => {
  for (const host of ["openjot.trajectonomics.com", "moojot.trajectonomics.com"]) {
    const calls = [];
    const fetch = async (url) => {
      calls.push(url);
      return new Response("{}", { status: 200 });
    };
    const res = await handle(
      new Request(`https://${host}/ingest/e/`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
      env,
      null,
      { fetch },
    );
    assert.equal(res.status, 200, host);
    assert.deepEqual(calls, ["https://eu.i.posthog.com/e/"]);
  }
});

test("both old hosts still proxy /ingest and its scripts instead of redirecting them", async () => {
  for (const host of ["openjot.trajectonomics.com", "moojot.trajectonomics.com"]) {
    const calls = [];
    const fetch = async (url) => {
      calls.push(url);
      return new Response("// posthog", { status: 200 });
    };
    const exact = await handle(new Request(`https://${host}/ingest`), env, null, { fetch });
    assert.notEqual(exact.status, 301, host);
    const script = await handle(
      new Request(`https://${host}/ingest/static/array.js`),
      env,
      null,
      { fetch },
    );
    assert.notEqual(script.status, 301, host);
    assert.deepEqual(calls, [
      "https://eu.i.posthog.com/",
      "https://eu-assets.i.posthog.com/static/array.js",
    ]);
  }
});

test("the apex /openjot/ingest proxy strips the prefix and keeps the path and query", async () => {
  const calls = [];
  const fetch = async (url) => {
    calls.push(url);
    return new Response("{}", { status: 200 });
  };
  const res = await handle(
    new Request("https://trajectonomics.com/openjot/ingest/e/?compression=gzip-js", {
      method: "POST",
      body: "{}",
    }),
    env,
    null,
    { fetch },
  );
  assert.equal(res.status, 200);
  assert.deepEqual(calls, ["https://eu.i.posthog.com/e/?compression=gzip-js"]);
});

test("when the API is rate limited, the ref advertisement gives the newest openjot APK, not the archived one", async () => {
  const newest = "openjot-v1.5.0";
  const gh = routes([
    [API_LIST, () => new Response("{}", { status: 403 })],
    [
      WEB_REFS,
      () =>
        new Response(
          refsAdvert(
            "refs/heads/main",
            "refs/tags/cli-v0.7.0",
            "refs/tags/tax-v0.2.0",
            "refs/tags/openjot-v1.4.0",
            `refs/tags/${newest}`,
          ),
        ),
    ],
    [`https://github.com/${REPO}/releases/tag/${newest}`, () => new Response("<span>Latest</span>")],
    [
      `https://github.com/${REPO}/releases/expanded_assets/${newest}`,
      () =>
        new Response(
          `<a href="/${REPO}/releases/download/${newest}/openjot-android-arm64.apk">apk</a>` +
            `<a href="/${REPO}/releases/download/${newest}/SHA256SUMS">sums</a>` +
            `<a href="/${REPO}/archive/refs/tags/${newest}.zip">zip</a>`,
        ),
    ],
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
    `https://github.com/${REPO}/releases/download/${newest}/openjot-android-arm64.apk`,
  );
  assert.deepEqual(
    gh.calls.filter((url) => url.includes("/releases/tag/")),
    [`https://github.com/${REPO}/releases/tag/${newest}`],
  );
  assert.deepEqual(
    gh.calls.filter((url) => url.includes(ARCHIVED_REPO)),
    [],
  );
  const api = await handle(req("/api/release"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  const { release: found } = await api.json();
  assert.equal(found.version, newest);
  assert.equal(found.apk.size, null);
  assert.match(found.checksumsUrl, /openjot-v1\.5\.0\/SHA256SUMS$/);
});

test("openjot-v1.10.0 sorts above openjot-v1.9.0 in the ref advertisement", async () => {
  const older = "openjot-v1.9.0";
  const newest = "openjot-v1.10.0";
  const gh = routes([
    [API_LIST, () => new Response("{}", { status: 403 })],
    [WEB_REFS, () => new Response(refsAdvert(`refs/tags/${older}`, `refs/tags/${newest}`))],
    [`https://github.com/${REPO}/releases/tag/${newest}`, () => new Response("<span>Latest</span>")],
    [
      `https://github.com/${REPO}/releases/expanded_assets/${newest}`,
      () => new Response(`<a href="/${REPO}/releases/download/${newest}/openjot-android-arm64.apk">apk</a>`),
    ],
  ]);
  const res = await handle(req("/download"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(
    res.headers.get("location"),
    `https://github.com/${REPO}/releases/download/${newest}/openjot-android-arm64.apk`,
  );
});

test("a tag that does not parse as a version sorts after the numeric ones", async () => {
  const stable = "openjot-v1.5.0";
  const strange = "openjot-v2.0.0-beta";
  const gh = routes([
    [API_LIST, () => new Response("{}", { status: 403 })],
    [WEB_REFS, () => new Response(refsAdvert(`refs/tags/${strange}`, `refs/tags/${stable}`))],
    [`https://github.com/${REPO}/releases/tag/${stable}`, () => new Response("<span>Latest</span>")],
    [
      `https://github.com/${REPO}/releases/expanded_assets/${stable}`,
      () => new Response(`<a href="/${REPO}/releases/download/${stable}/openjot-android-arm64.apk">apk</a>`),
    ],
  ]);
  const res = await handle(req("/download"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(
    res.headers.get("location"),
    `https://github.com/${REPO}/releases/download/${stable}/openjot-android-arm64.apk`,
  );
  assert.equal(gh.calls.some((url) => url.includes(encodeURIComponent(strange))), false);
});

test("peeled ^{} refs are ignored", async () => {
  const tag = "openjot-v1.5.0";
  const gh = routes([
    [API_LIST, () => new Response("{}", { status: 403 })],
    [WEB_REFS, () => new Response(refsAdvert(`refs/tags/${tag}`))],
    [`https://github.com/${REPO}/releases/tag/${tag}`, () => new Response("<span>Latest</span>")],
    [
      `https://github.com/${REPO}/releases/expanded_assets/${tag}`,
      () => new Response(`<a href="/${REPO}/releases/download/${tag}/openjot-android-arm64.apk">apk</a>`),
    ],
  ]);
  const res = await handle(req("/download"), env, null, { fetch: gh.fetch, cache: memoryCache() });
  assert.equal(
    res.headers.get("location"),
    `https://github.com/${REPO}/releases/download/${tag}/openjot-android-arm64.apk`,
  );
  assert.equal(gh.calls.filter((url) => url.includes("/releases/tag/")).length, 1);
  assert.equal(gh.calls.some((url) => url.includes("%5E") || url.includes("^{}")), false);
});

test("the github.com fallback skips a prerelease and takes the next tag", async () => {
  const beta = "openjot-v1.5.0";
  const stable = "openjot-v1.4.0";
  const gh = routes([
    [API_LIST, () => new Response("{}", { status: 403 })],
    [WEB_REFS, () => new Response(refsAdvert(`refs/tags/${beta}`, `refs/tags/${stable}`))],
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

test("a non-2xx ref advertisement throws and never falls back to the archived APK", async () => {
  const gh = routes([
    [API_LIST, () => new Response("{}", { status: 403 })],
    [WEB_REFS, () => new Response("", { status: 500 })],
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

test("when the API is rate limited and there is no openjot release, the archived repository answers", async () => {
  const gh = routes([
    [API_LIST, () => new Response("{}", { status: 403 })],
    [WEB_REFS, () => new Response(refsAdvert("refs/heads/main", "refs/tags/cli-v0.7.0"))],
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
