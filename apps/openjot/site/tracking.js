// Source links, cookieless counting and the PostHog proxy for openjot.trajectonomics.com
// (and the moojot.trajectonomics.com host, which forwards to it). Routed from handle() in release.js.
//
//   /go/<source>[/<campaign>]        302 to the landing page with utm_* tags, and counts
//                                    a `link_clicked` event.
//   /download/<source>[/<campaign>]  302 straight to the APK, and counts `apk_download`.
//   /download                        Counts `apk_download` too. The source comes from the
//                                    landing page URL in the Referer (its utm_* tags), or
//                                    from the referring site.
//   /ingest/*                        First-party proxy to PostHog EU Cloud. The landing page
//                                    uses it after cookie consent, and the app uses it once
//                                    the user opts in to usage stats.
//
// The counts are sent from the Worker with no cookie, no IP address and no user agent, a
// fresh random id for every event, and no person profile. They need no consent, and they
// carry only: source, medium, campaign, the link slug, the country Cloudflare resolved, a
// coarse platform (android, ios, desktop, other) and which in-app browser it was, if any.

/** Short slugs for the places OpenJot is posted. Any other valid slug works too, as its own source. */
export const SOURCES = {
  ig: { source: "instagram", medium: "social" },
  fb: { source: "facebook", medium: "social" },
  x: { source: "x", medium: "social" },
  threads: { source: "threads", medium: "social" },
  tiktok: { source: "tiktok", medium: "social" },
  yt: { source: "youtube", medium: "video" },
  line: { source: "line", medium: "messaging" },
  gh: { source: "github", medium: "referral" },
  qr: { source: "qr", medium: "offline" },
};

/** Longer spellings people may type, mapped to the slugs above. */
const ALIASES = {
  instagram: "ig",
  facebook: "fb",
  twitter: "x",
  tt: "tiktok",
  youtube: "yt",
  github: "gh",
};

const SLUG = /^[a-z0-9][a-z0-9_-]{0,39}$/;
/** Request headers the /ingest proxy passes on. Everything else (cookies, spoofable IP headers) is dropped. */
const PROXY_HEADERS = ["accept", "accept-encoding", "accept-language", "content-encoding", "content-type", "origin", "user-agent"];
const PROXY_METHODS = ["GET", "HEAD", "POST", "OPTIONS"];
const HOST = /^[a-z0-9.-]{1,100}$/;
const BOT =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|facebot|embedly|whatsapp|telegram|discord|slack|skype|headless|lighthouse|curl|wget|python|go-http|node-fetch|axios/i;

/** { slug, source, medium } for a slug, or null when it isn't a valid slug. */
export function resolveSource(slug) {
  const key = String(slug ?? "").toLowerCase();
  if (!SLUG.test(key)) return null;
  const canonical = ALIASES[key] ?? key;
  return { slug: canonical, ...(SOURCES[canonical] ?? { source: canonical, medium: "link" }) };
}

/** Parse the part after /go or /download, e.g. "/ig/reel-12". Null when it isn't a source link. */
export function parseSourcePath(rest) {
  const parts = String(rest ?? "").split("/").filter(Boolean);
  if (parts.length === 0 || parts.length > 2) return null;
  const src = resolveSource(parts[0]);
  if (!src) return null;
  const campaign = parts[1] ? parts[1].toLowerCase() : null;
  if (campaign !== null && !SLUG.test(campaign)) return null;
  return { ...src, campaign };
}

/** The landing page URL a /go link redirects to. Keeps ?lang= so a link can force a language. */
export function landingUrl(requestUrl, link) {
  const from = new URL(requestUrl);
  const url = new URL("/", from);
  const lang = from.searchParams.get("lang");
  if (lang === "th" || lang === "en") url.searchParams.set("lang", lang);
  url.searchParams.set("utm_source", link.source);
  url.searchParams.set("utm_medium", link.medium);
  if (link.campaign) url.searchParams.set("utm_campaign", link.campaign);
  return url.toString();
}

function linkProps(link, via) {
  return { source: link.source, medium: link.medium, campaign: link.campaign, link: link.slug, via };
}

/** Where a plain /download click came from, using only the Referer header. */
export function sourceFromReferer(request) {
  const raw = request.headers.get("referer");
  let ref = null;
  try {
    ref = raw ? new URL(raw) : null;
  } catch {
    ref = null;
  }
  if (!ref) return { source: "direct", medium: "none", campaign: null, link: null, via: "direct" };

  if (ref.host === new URL(request.url).host) {
    // A download button on the landing page. With Referrer-Policy
    // strict-origin-when-cross-origin, same-origin requests carry the full URL.
    const tag = (name) => {
      const value = (ref.searchParams.get(name) ?? "").toLowerCase();
      return SLUG.test(value) ? value : null;
    };
    return {
      source: tag("utm_source") ?? "website",
      medium: tag("utm_medium") ?? "none",
      campaign: tag("utm_campaign"),
      link: null,
      via: "page",
    };
  }

  const host = ref.hostname.toLowerCase();
  return {
    source: HOST.test(host) ? host : "unknown",
    medium: "referral",
    campaign: null,
    link: null,
    via: "direct",
  };
}

/** Coarse, non-identifying context from the request. The user agent itself is not sent. */
export function requestContext(request) {
  const ua = request.headers.get("user-agent") ?? "";
  const platform = /Android/i.test(ua)
    ? "android"
    : /iPhone|iPad|iPod/i.test(ua)
      ? "ios"
      : /Windows|Macintosh|Linux|CrOS/i.test(ua)
        ? "desktop"
        : "other";
  const inApp = /Instagram/i.test(ua)
    ? "instagram"
    : /FBAN|FBAV|FB_IAB/i.test(ua)
      ? "facebook"
      : /Barcelona/i.test(ua)
        ? "threads"
        : /Line\//i.test(ua)
          ? "line"
          : /musical_ly|BytedanceWebview|TikTok/i.test(ua)
            ? "tiktok"
            : /Twitter/i.test(ua)
              ? "x"
              : "none";
  return { country: request.cf?.country ?? null, platform, in_app_browser: inApp };
}

export function isBot(request) {
  const ua = request.headers.get("user-agent") ?? "";
  return ua === "" || BOT.test(ua);
}

function region(env) {
  return env?.POSTHOG_REGION === "us" ? "us" : "eu";
}

/** Send one anonymous event to PostHog. Never throws. Does nothing without POSTHOG_KEY. */
export async function capture(env, event, properties, deps = {}) {
  if (!env?.POSTHOG_KEY) return;
  const fetchImpl = deps.fetch ?? fetch;
  const id = deps.uuid ? deps.uuid() : crypto.randomUUID();
  const body = {
    api_key: env.POSTHOG_KEY,
    event,
    timestamp: new Date().toISOString(),
    properties: {
      distinct_id: id,
      $process_person_profile: false,
      // The Worker's own IP would give a wrong location. `country` comes from Cloudflare.
      $geoip_disable: true,
      $lib: "moojot-site-worker",
      ...properties,
    },
  };
  try {
    const res = await fetchImpl(`https://${region(env)}.i.posthog.com/i/v0/e/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.warn(`posthog capture answered ${res.status}`);
  } catch (error) {
    console.warn(`posthog capture failed: ${error.message}`);
  }
}

/** Count a link click or download, skipping bots, link previews and HEAD requests. */
export async function count(request, env, ctx, deps, event, properties) {
  if (request.method !== "GET" || isBot(request)) return;
  const sent = capture(env, event, { ...properties, ...requestContext(request) }, deps);
  if (ctx && ctx.waitUntil) ctx.waitUntil(sent);
  else await sent;
}

/** /go/<source>[/<campaign>] */
export async function handleGo(request, env, ctx, deps = {}) {
  const { pathname } = new URL(request.url);
  const link = parseSourcePath(pathname.slice("/go".length));
  if (!link) return redirect(new URL("/", request.url).toString());
  await count(request, env, ctx, deps, "link_clicked", linkProps(link, "link"));
  return redirect(landingUrl(request.url, link));
}

/** Properties for an apk_download from /download or /download/<source>[/<campaign>]. */
export function downloadSource(request) {
  const { pathname } = new URL(request.url);
  const link = parseSourcePath(pathname.slice("/download".length));
  return link ? linkProps(link, "link") : sourceFromReferer(request);
}

/**
 * /ingest/* -> PostHog. Scripts (/static, /array) come from the assets host and are
 * cached at the edge. Only the headers in PROXY_HEADERS are forwarded, so no cookies.
 * The visitor's IP, as Cloudflare saw it, is passed on as X-Forwarded-For so PostHog can
 * estimate the country, as it would without a proxy.
 */
export async function proxyIngest(request, env, deps = {}) {
  if (!PROXY_METHODS.includes(request.method)) {
    return new Response("method not allowed", { status: 405, headers: { allow: PROXY_METHODS.join(", ") } });
  }
  const fetchImpl = deps.fetch ?? fetch;
  const url = new URL(request.url);
  const path = url.pathname.slice("/ingest".length) || "/";
  const isAsset = path.startsWith("/static/") || path.startsWith("/array/");
  const host = `${region(env)}${isAsset ? "-assets" : ""}.i.posthog.com`;

  const headers = new Headers();
  for (const name of PROXY_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) headers.set("x-forwarded-for", ip);

  const init = { method: request.method, headers, redirect: "manual" };
  if (request.method !== "GET" && request.method !== "HEAD") init.body = await request.arrayBuffer();
  if (isAsset) init.cf = { cacheEverything: true, cacheTtl: 3600 };
  return fetchImpl(`https://${host}${path}${url.search}`, init);
}

export function redirect(location, status = 302) {
  return new Response(null, {
    status,
    headers: { location, "cache-control": "no-store" },
  });
}
