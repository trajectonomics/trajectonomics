// Request handling for the openjot.trajectonomics.com Worker (entry: worker.js), which also
// serves moojot.trajectonomics.com and redirects it to the new host. The landing page moved to the
// Site on 2026-11-26: see apps/site (ADR 0032).
//
// Static files in ./public are served by Workers Static Assets. The Worker
// only runs for the paths listed in wrangler.jsonc `run_worker_first`:
//
//   /            301 to the landing page on the Site, keeping the query.
//   /download     302 to the APK in the newest `openjot-v*` GitHub release of the
//                 monorepo, so a reel can say "openjot.trajectonomics.com/download"
//                 and the link never goes stale. Until the first one exists it uses
//                 the archived trajectonomics/moojot repository's latest release.
//                 /download/<source> does the same and records where the click came from.
//   /download/checksums  302 to that release's SHA256SUMS, through the same lookup.
//   /api/release  JSON describing that release, used by the comparison page.
//   /go/*, /ingest/*  Source links and the PostHog proxy: see tracking.js.

import { count, downloadSource, handleGo, proxyIngest, redirect } from "./tracking.js";

export const REPO = "trajectonomics/trajectonomics";
/** The site's own host. */
export const SITE_HOST = "openjot.trajectonomics.com";
/** The host the site moved from; it redirects here, except for the analytics proxy. */
export const OLD_SITE_HOST = "moojot.trajectonomics.com";
/** The landing page's address on the Site: `/` on this host answers 301 here. */
export const LANDING_URL = "https://trajectonomics.com/openjot/";
/** The app's releases carry this prefix, so a `cli-v*` or `tax-v*` release never wins. */
export const TAG_PREFIX = "openjot-v";
/** The app's home before the move; its latest release is the fallback until the first openjot-v* one. */
export const ARCHIVED_REPO = "trajectonomics/moojot";
export const RELEASES_URL = `https://github.com/${REPO}/releases?q=${TAG_PREFIX}`;
export const NO_RELEASE_PATH = LANDING_URL;
const CACHE_SECONDS = 300;
const CACHE_KEY = "https://moojot.trajectonomics.com/__cache/latest-release";
const API = "https://api.github.com";
const WEB = "https://github.com";
/** How many candidate tags the github.com fallback inspects before giving up. */
const WEB_CANDIDATES = 5;

/**
 * Reduce a GitHub release payload to what the page needs.
 * Returns null when the release is a draft or a prerelease, or has no APK to download.
 */
export function pickRelease(release) {
  if (!release || release.draft || release.prerelease || !Array.isArray(release.assets)) return null;
  const apks = release.assets.filter((a) => a.name.toLowerCase().endsWith(".apk"));
  if (apks.length === 0) return null;
  const apk =
    apks.find((a) => /universal/i.test(a.name)) ??
    apks.find((a) => /arm64|aarch64/i.test(a.name)) ??
    apks[0];
  const sums = release.assets.find((a) => a.name === "SHA256SUMS");
  return {
    version: release.tag_name,
    publishedAt: release.published_at,
    pageUrl: release.html_url,
    apk: { name: apk.name, size: apk.size, url: apk.browser_download_url },
    checksumsUrl: sums ? sums.browser_download_url : null,
  };
}

/** The newest openjot-v* release (or null), cached at the edge for CACHE_SECONDS. Throws on GitHub errors. */
export async function latestRelease(ctx, deps = {}) {
  const fetchImpl = deps.fetch ?? fetch;
  const cache = deps.cache ?? (typeof caches === "undefined" ? null : caches.default);
  const key = new Request(CACHE_KEY);

  const hit = cache ? await cache.match(key) : undefined;
  if (hit) return hit.json();

  // The archived repository answers only when this lookup succeeded and found no
  // openjot-v* release. A lookup that throws means GitHub is unavailable, and it
  // rethrows instead: falling back then would serve an old APK once one exists.
  const found = await openjotRelease(fetchImpl);
  const release = found ?? (await archivedRelease(fetchImpl)); // throws too: never cache an error

  if (cache) {
    const stored = Response.json(release, {
      headers: { "cache-control": `public, max-age=${CACHE_SECONDS}` },
    });
    const put = cache.put(key, stored);
    if (ctx && ctx.waitUntil) ctx.waitUntil(put);
    else await put;
  }
  return release;
}

/** Newest release whose tag starts with TAG_PREFIX, from the API or, when it is rate limited, from github.com. */
async function openjotRelease(fetchImpl) {
  try {
    return await fromApiList(fetchImpl);
  } catch (apiError) {
    // Unauthenticated API calls share a 60/hour limit per IP, and Cloudflare's
    // egress IPs are shared, so a 403 here is normal. Read the web pages instead.
    console.warn(`release lookup: ${apiError.message}; trying github.com`);
    return fromWebList(fetchImpl);
  }
}

/** The archived repository's latest release, for the time before the first openjot-v* release. */
async function archivedRelease(fetchImpl) {
  try {
    return await fromApiLatest(fetchImpl, ARCHIVED_REPO);
  } catch (apiError) {
    console.warn(`archived release lookup: ${apiError.message}; trying github.com`);
    return fromWebLatest(fetchImpl, ARCHIVED_REPO);
  }
}

const UA = { "user-agent": "openjot-site (+https://openjot.trajectonomics.com)" };

async function fromApiList(fetchImpl) {
  const res = await fetchImpl(`${API}/repos/${REPO}/releases?per_page=100`, {
    headers: { accept: "application/vnd.github+json", ...UA },
  });
  if (res.status === 200) {
    const releases = await res.json();
    if (!Array.isArray(releases)) return null;
    const match = releases.find(
      (release) =>
        typeof release.tag_name === "string" &&
        release.tag_name.startsWith(TAG_PREFIX) &&
        !release.draft &&
        !release.prerelease,
    );
    return match ? pickRelease(match) : null;
  }
  if (res.status === 404) return null; // no releases yet
  throw new Error(`GitHub API answered ${res.status}`);
}

async function fromApiLatest(fetchImpl, repo) {
  const res = await fetchImpl(`${API}/repos/${repo}/releases/latest`, {
    headers: { accept: "application/vnd.github+json", ...UA },
  });
  if (res.status === 200) return pickRelease(await res.json());
  if (res.status === 404) return null; // no published release yet
  throw new Error(`GitHub API answered ${res.status}`);
}

/**
 * Same answer from github.com: the repository's tag refs, then each tag's own page.
 * The releases search page stopped rendering tag links by 2026-11-26, and the Atom
 * feed mixes every package's releases, so the git ref advertisement is the list:
 * it has every tag and no API rate limit.
 */
async function fromWebList(fetchImpl) {
  const refs = await fetchImpl(`${WEB}/${REPO}.git/info/refs?service=git-upload-pack`, {
    headers: UA,
  });
  if (!refs.ok) throw new Error(`github.com answered ${refs.status}`);
  const advertisement = await refs.text();
  const tags = [];
  for (const m of advertisement.matchAll(/refs\/tags\/([^\s^\0]+)(\^\{\})?/g)) {
    if (m[2]) continue; // the peeled `^{}` entry of an annotated tag
    const tag = m[1];
    if (tag.startsWith(TAG_PREFIX) && !tags.includes(tag)) tags.push(tag);
  }
  tags.sort(byVersionDesc);
  for (const tag of tags.slice(0, WEB_CANDIDATES)) {
    const release = await fromWebTag(fetchImpl, REPO, tag);
    if (release) return release;
  }
  return null;
}

/** Newest first by the numeric major.minor.patch after the prefix; a tag that does not parse sorts last. */
function byVersionDesc(a, b) {
  const pa = a.slice(TAG_PREFIX.length).match(/^(\d+)\.(\d+)\.(\d+)$/);
  const pb = b.slice(TAG_PREFIX.length).match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!pa || !pb) return (pa ? 0 : 1) - (pb ? 0 : 1);
  return (
    Number(pb[1]) - Number(pa[1]) ||
    Number(pb[2]) - Number(pa[2]) ||
    Number(pb[3]) - Number(pa[3])
  );
}

/** One release from github.com. Null when the tag is not a published, non-prerelease release. */
async function fromWebTag(fetchImpl, repo, tag) {
  const page = await fetchImpl(`${WEB}/${repo}/releases/tag/${encodeURIComponent(tag)}`, {
    headers: UA,
  });
  if (page.status === 404) return null; // a draft, or a tag with no release
  if (!page.ok) throw new Error(`github.com answered ${page.status}`);
  if (/>Pre-release</.test(await page.text())) return null;

  const list = await fetchImpl(
    `${WEB}/${repo}/releases/expanded_assets/${encodeURIComponent(tag)}`,
    { headers: UA },
  );
  if (!list.ok) throw new Error(`github.com assets answered ${list.status}`);
  const html = await list.text();
  const prefix = `/${repo}/releases/download/`;
  const names = new Set();
  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    if (m[1].startsWith(prefix)) names.add(decodeURIComponent(m[1].split("/").pop()));
  }
  const base = `${WEB}/${repo}/releases`;
  return pickRelease({
    tag_name: tag,
    draft: false,
    prerelease: false,
    published_at: null,
    html_url: `${base}/tag/${encodeURIComponent(tag)}`,
    assets: [...names].map((name) => ({
      name,
      size: null,
      browser_download_url: `${base}/download/${encodeURIComponent(tag)}/${encodeURIComponent(name)}`,
    })),
  });
}

/** Same answer from github.com for one repository's latest release. */
export async function fromWebLatest(fetchImpl, repo = REPO) {
  const latest = await fetchImpl(`${WEB}/${repo}/releases/latest`, {
    redirect: "manual",
    headers: UA,
  });
  const location = latest.headers.get("location") ?? "";
  const tagMatch = location.match(/\/releases\/tag\/([^/?#]+)$/);
  if (latest.status >= 300 && latest.status < 400 && !tagMatch) return null;
  if (!tagMatch) throw new Error(`github.com answered ${latest.status}`);
  return fromWebTag(fetchImpl, repo, decodeURIComponent(tagMatch[1]));
}

export async function handle(request, env, ctx, deps = {}) {
  const url = new URL(request.url);
  const { pathname } = url;

  // The site moved to SITE_HOST. App versions up to 1.4.0 post their analytics to the old
  // host's /ingest, where a 301 would drop them, so that path is exempt and proxied as before.
  if (url.hostname === OLD_SITE_HOST) {
    const method = request.method.toUpperCase();
    const isIngest = pathname === "/ingest" || pathname.startsWith("/ingest/");
    if ((method === "GET" || method === "HEAD") && !isIngest) {
      return redirect(`https://${SITE_HOST}${pathname}${url.search}`, 301);
    }
  }

  // The landing page moved to the Site; its own Worker still owns downloads, go links and the API.
  const method = request.method.toUpperCase();
  if ((method === "GET" || method === "HEAD") && (pathname === "/" || pathname === "/index.html")) {
    return redirect(`${LANDING_URL}${url.search}`, 301);
  }

  if (pathname === "/download/checksums") {
    let to = RELEASES_URL;
    try {
      const release = await latestRelease(ctx, deps);
      to = release?.checksumsUrl ?? release?.pageUrl ?? new URL(NO_RELEASE_PATH, request.url).toString();
    } catch {
      // GitHub is unavailable: send people to the releases page.
    }
    return redirect(to);
  }

  if (pathname === "/download" || pathname.startsWith("/download/")) {
    let to = RELEASES_URL;
    let outcome = "releases_page";
    let version = null;
    try {
      const release = await latestRelease(ctx, deps);
      to = release ? release.apk.url : new URL(NO_RELEASE_PATH, request.url).toString();
      outcome = release ? "apk" : "coming_soon";
      version = release ? release.version : null;
    } catch {
      // GitHub is unavailable: send people to the releases page.
    }
    await count(request, env, ctx, deps, "apk_download", {
      ...downloadSource(request),
      outcome,
      apk_version: version,
    });
    return redirect(to);
  }

  if (pathname === "/go" || pathname.startsWith("/go/")) return handleGo(request, env, ctx, deps);
  if (pathname.startsWith("/ingest/")) return proxyIngest(request, env, deps);

  if (pathname === "/api/release") {
    try {
      const release = await latestRelease(ctx, deps);
      return Response.json(
        { release },
        { headers: { "cache-control": `public, max-age=${CACHE_SECONDS}` } },
      );
    } catch {
      return Response.json(
        { release: null, error: "unavailable" },
        { status: 503, headers: { "cache-control": "no-store" } },
      );
    }
  }

  return env.ASSETS.fetch(request);
}
