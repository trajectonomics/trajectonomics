// Run with: node --test site/tracking.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { handle } from "./release.js";
import { landingUrl, parseSourcePath, requestContext, resolveSource, sourceFromReferer } from "./tracking.js";

const KEY = "phc_test";
const env = {
  ASSETS: { fetch: async () => new Response("asset") },
  POSTHOG_KEY: KEY,
  POSTHOG_REGION: "eu",
};
const PHONE =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36";
const INSTAGRAM = `${PHONE} Instagram 360.0.0.0.0 Android`;

const req = (path, headers = {}, init = {}) =>
  new Request(`https://openjot.trajectonomics.com${path}`, { headers: { "user-agent": PHONE, ...headers }, ...init });

function memoryCache() {
  const store = new Map();
  return {
    match: async (r) => store.get(r.url)?.clone(),
    put: async (r, res) => void store.set(r.url, res),
  };
}

/** Fake network: GitHub serves a v1.0.0 release, PostHog accepts everything. Records PostHog calls. */
function network() {
  const events = [];
  const proxied = [];
  const fetch = async (url, init = {}) => {
    if (url === "https://eu.i.posthog.com/i/v0/e/") {
      events.push(JSON.parse(init.body));
      return new Response("{}", { status: 200 });
    }
    if (url.includes(".i.posthog.com/")) {
      proxied.push({ url, init });
      return new Response("proxied", { status: 200 });
    }
    if (url.startsWith("https://api.github.com/")) {
      return Response.json([
        {
          tag_name: "openjot-v1.0.0",
          draft: false,
          prerelease: false,
          assets: [{ name: "openjot-android-arm64.apk", size: 1, browser_download_url: "https://github.com/x/openjot-android-arm64.apk" }],
        },
      ]);
    }
    return new Response("not found", { status: 404 });
  };
  return { fetch, events, proxied, deps: { fetch, cache: memoryCache(), uuid: () => "uuid-1" } };
}

test("slugs resolve to a source, aliases included, and anything else valid becomes its own source", () => {
  assert.deepEqual(resolveSource("ig"), { slug: "ig", source: "instagram", medium: "social" });
  assert.deepEqual(resolveSource("Instagram"), { slug: "ig", source: "instagram", medium: "social" });
  assert.deepEqual(resolveSource("pantip"), { slug: "pantip", source: "pantip", medium: "link" });
  assert.equal(resolveSource("bad slug"), null);
  assert.equal(resolveSource("<script>"), null);
  assert.deepEqual(parseSourcePath("/fb/reel-12"), { slug: "fb", source: "facebook", medium: "social", campaign: "reel-12" });
  assert.equal(parseSourcePath("/"), null);
  assert.equal(parseSourcePath("/ig/a/b"), null);
  assert.equal(parseSourcePath("/ig/no spaces"), null);
});

test("landing URLs carry utm tags and keep ?lang=", () => {
  const link = parseSourcePath("/ig/reel-12");
  assert.equal(
    landingUrl("https://openjot.trajectonomics.com/go/ig/reel-12?lang=en&x=1", link),
    "https://openjot.trajectonomics.com/?lang=en&utm_source=instagram&utm_medium=social&utm_campaign=reel-12",
  );
});

test("/go/<source> redirects to the tagged landing page and counts one anonymous click", async () => {
  const net = network();
  const res = await handle(req("/go/ig/reel-12", { "user-agent": INSTAGRAM }), env, null, net.deps);
  assert.equal(res.status, 302);
  assert.equal(
    res.headers.get("location"),
    "https://openjot.trajectonomics.com/?utm_source=instagram&utm_medium=social&utm_campaign=reel-12",
  );
  assert.equal(net.events.length, 1);
  const [event] = net.events;
  assert.equal(event.api_key, KEY);
  assert.equal(event.event, "link_clicked");
  assert.deepEqual(event.properties, {
    distinct_id: "uuid-1",
    $process_person_profile: false,
    $geoip_disable: true,
    $lib: "moojot-site-worker",
    source: "instagram",
    medium: "social",
    campaign: "reel-12",
    link: "ig",
    via: "link",
    country: null,
    platform: "android",
    in_app_browser: "instagram",
  });
});

test("the Worker never forwards the IP address or user agent in a count", async () => {
  const net = network();
  await handle(req("/go/fb", { "cf-connecting-ip": "203.0.113.9", cookie: "a=b" }), env, null, net.deps);
  const sent = JSON.stringify(net.events);
  assert.doesNotMatch(sent, /203\.0\.113\.9|Pixel 8|a=b/);
});

test("bad /go links go home without counting, and so do bots and link previews", async () => {
  const net = network();
  const bad = await handle(req("/go/not%20a%20slug"), env, null, net.deps);
  assert.equal(bad.headers.get("location"), "https://openjot.trajectonomics.com/");
  await handle(req("/go/ig", { "user-agent": "facebookexternalhit/1.1" }), env, null, net.deps);
  await handle(req("/go/ig", { "user-agent": "WhatsApp/2.23.20.0" }), env, null, net.deps);
  await handle(req("/go/ig", { "user-agent": "" }), env, null, net.deps);
  await handle(req("/go/ig", {}, { method: "HEAD" }), env, null, net.deps);
  assert.equal(net.events.length, 0);
});

test("/download/<source> goes straight to the APK and counts the download with its source", async () => {
  const net = network();
  const res = await handle(req("/download/tiktok/launch"), env, null, net.deps);
  assert.equal(res.headers.get("location"), "https://github.com/x/openjot-android-arm64.apk");
  const [event] = net.events;
  assert.equal(event.event, "apk_download");
  assert.equal(event.properties.source, "tiktok");
  assert.equal(event.properties.campaign, "launch");
  assert.equal(event.properties.via, "link");
  assert.equal(event.properties.outcome, "apk");
  assert.equal(event.properties.apk_version, "openjot-v1.0.0");
});

test("/download from the landing page takes the source from the page's utm tags", async () => {
  const net = network();
  const referer = "https://openjot.trajectonomics.com/?utm_source=instagram&utm_medium=social&utm_campaign=reel-12";
  await handle(req("/download", { referer }), env, null, net.deps);
  const { properties } = net.events[0];
  assert.equal(properties.source, "instagram");
  assert.equal(properties.medium, "social");
  assert.equal(properties.campaign, "reel-12");
  assert.equal(properties.via, "page");
});

test("sourceFromReferer: untagged page, another site, and no referer", () => {
  const from = (referer) => sourceFromReferer(req("/download", referer ? { referer } : {}));
  assert.equal(from("https://openjot.trajectonomics.com/#install").source, "website");
  assert.equal(from("https://l.instagram.com/").source, "l.instagram.com");
  assert.equal(from("https://l.instagram.com/").medium, "referral");
  assert.equal(from(null).source, "direct");
  assert.equal(from("not a url").source, "direct");
  assert.equal(from("https://openjot.trajectonomics.com/?utm_source=%3Cb%3E").source, "website");
});

test("requestContext keeps only coarse labels", () => {
  assert.deepEqual(requestContext(req("/", { "user-agent": INSTAGRAM })), {
    country: null,
    platform: "android",
    in_app_browser: "instagram",
  });
  const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Line/13.0.0";
  assert.deepEqual(requestContext(req("/", { "user-agent": iphone })), { country: null, platform: "ios", in_app_browser: "line" });
});

test("ctx.waitUntil carries the count, so the redirect doesn't wait for PostHog", async () => {
  const net = network();
  const waited = [];
  await handle(req("/go/x"), env, { waitUntil: (p) => waited.push(p) }, net.deps);
  assert.equal(waited.length, 1);
  await Promise.all(waited);
  assert.equal(net.events[0].properties.source, "x");
});

test("without POSTHOG_KEY nothing is sent, and links still work", async () => {
  const net = network();
  const res = await handle(req("/go/ig"), { ASSETS: env.ASSETS }, null, net.deps);
  assert.equal(res.status, 302);
  assert.equal(net.events.length, 0);
});

test("/ingest proxies events to PostHog EU without cookies, passing the visitor IP", async () => {
  const net = network();
  const res = await handle(
    req(
      "/ingest/e/?compression=gzip-js",
      {
        cookie: "ph_x=1",
        "cf-connecting-ip": "203.0.113.9",
        "x-forwarded-for": "198.51.100.1",
        "x-real-ip": "198.51.100.2",
        "content-type": "text/plain",
      },
      { method: "POST", body: "payload" },
    ),
    env,
    null,
    net.deps,
  );
  assert.equal(await res.text(), "proxied");
  const [call] = net.proxied;
  assert.equal(call.url, "https://eu.i.posthog.com/e/?compression=gzip-js");
  assert.equal(call.init.method, "POST");
  assert.equal(new TextDecoder().decode(call.init.body), "payload");
  assert.equal(call.init.headers.get("cookie"), null);
  assert.equal(call.init.headers.get("x-real-ip"), null);
  assert.equal(call.init.headers.get("x-forwarded-for"), "203.0.113.9");
  assert.equal(call.init.headers.get("content-type"), "text/plain");
});

test("/ingest only proxies the methods PostHog needs", async () => {
  const net = network();
  const res = await handle(req("/ingest/e/", {}, { method: "PUT", body: "x" }), env, null, net.deps);
  assert.equal(res.status, 405);
  assert.equal(net.proxied.length, 0);
});

test("/ingest/static and /ingest/array come from the assets host", async () => {
  const net = network();
  await handle(req("/ingest/static/array.js"), env, null, net.deps);
  await handle(req("/ingest/array/phc_test/config.js"), env, null, net.deps);
  assert.deepEqual(
    net.proxied.map((c) => c.url),
    ["https://eu-assets.i.posthog.com/static/array.js", "https://eu-assets.i.posthog.com/array/phc_test/config.js"],
  );
});

/** A JSON string, a `//` line comment, or a block comment; strings survive, comments do not. */
const JSONC_COMMENT = /("(?:\\.|[^"\\])*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g;

/** `wrangler.jsonc` as an object, stripped the same way apps/site and apps/blog strip theirs. */
function wranglerConfig() {
  const text = readFileSync(new URL("./wrangler.jsonc", import.meta.url), "utf8");
  return JSON.parse(text.replace(JSONC_COMMENT, (_match, string) => string ?? ""));
}

test("every page runs the Worker first, so the old host can redirect it", () => {
  const first = wranglerConfig().assets.run_worker_first;
  for (const path of ["/", "/meowjot-alternative"]) {
    assert.ok(first.includes(path), `run_worker_first lists ${path}`);
  }
  // html_handling "auto-trailing-slash" turns index.html into / and <name>.html into /<name>.
  const pages = readdirSync(new URL("./public", import.meta.url))
    .filter((name) => name.endsWith(".html") && name !== "404.html")
    .map((name) => (name === "index.html" ? "/" : `/${name.slice(0, -".html".length)}`));
  for (const path of pages) {
    assert.ok(first.includes(path), `${path} is in run_worker_first, or the old host serves it instead of redirecting`);
  }
});

test("the PostHog key is the same in wrangler.jsonc, the page and the app", () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
  const keys = [read("./wrangler.jsonc"), read("./public/analytics.js"), read("../src/lib/analytics.ts")].map(
    (text) => text.match(/phc_[A-Za-z0-9]+/)?.[0],
  );
  assert.ok(keys[0], "wrangler.jsonc has a key");
  assert.deepEqual(new Set(keys).size, 1, `keys differ: ${keys.join(", ")}`);
});
