# ADR 0006: The data site is served under the Site's host

## Status

Accepted, 2026-11-27. It changes the host and path names in ADRs 0001, 0003 and 0004; their
decisions otherwise stand.

## Context

On 2026-11-27 the owner decided that every static site is served under one host,
`https://trajectonomics.com`: the Site at `/`, the Docs Portal at `/docs/`, the blog at `/blog/`
and the data site at `/data/`. Search results and visitors then land on one site, and only a future
single-page app gets its own subdomain.

There is no router Worker: the retired `web-router` repository is not deployed (checked in
Cloudflare on 2026-11-27). Cloudflare chooses the Worker by route. The apex is a Custom Domain on
the `site` Worker, and a sub-app's Worker declares a zone route, which takes precedence over a
Custom Domain on the same hostname.

Moving the pages alone would break the collector and any saved link. Manual sends POST to
`https://data.trajectonomics.com/ingest`, and a 301 on that POST would turn it into a GET.

## Decision

- The `data` Worker keeps its own build, checks and deploy. Its `routes` declare
  `trajectonomics.com/data*` in the `trajectonomics.com` zone, and keep the old host as a Custom
  Domain so the Worker still answers there.
- `assets.base_path` is `/data`. The assets binding serves the root of `dist/` at `/data/`, so the
  Astro build stays in `./dist` and is not nested under `dist/data`. `run_worker_first` names the
  full public paths, `/data/api/*` and `/data/ingest`; a request outside `/data/` does not match an
  asset and reaches the Worker.
- Astro builds with `site: "https://trajectonomics.com"` and `base: "/data"`. Canonical and
  `og:url` links are absolute at the apex; page and asset links are root-relative under `/data/`.
- The API moves to `/data/api/usage` and `/data/api/health`; ingest moves to `/data/ingest`. They
  keep the same auth, validation, caching and status codes.
- The old host still answers `/api/*` and `/ingest` exactly as before, with no redirect: the
  collector's POST must not become a GET. Every other GET or HEAD on the old host answers a 301 to
  the same path under the base path on the apex, keeping the query string. A path that already
  starts with `/data/` is not prefixed again. Any other method on a page answers 405.
- Old-host handling applies only when the hostname is exactly the old host. `wrangler dev` on
  localhost serves the new addresses directly and never redirects.
- The cache keys of the read API normalise to the apex's canonical URL, so the old host's
  `/api/...` and the apex's `/data/api/...` share one cached copy per resource.
- The Site owns the host-root files (`robots.txt`, the root favicon). The data build emits nothing
  at the host root; everything it emits is served under `/data/`.

## Consequences

- Existing links and search results to the old host reach the page after one 301. A link that
  already names `/data/...` on the old host is answered by the assets binding before the Worker
  runs when that path is an asset; the redirect rule and its single-prefix rule cover every request
  the Worker does receive. Such a page calls `/data/api/*` on the host it came from, so the old host
  answers the API and ingest under the base path too, rather than redirecting them cross-origin.
- The collector can keep POSTing to the old host's `/ingest`. Moving it to
  `https://trajectonomics.com/data/ingest` is a one-line change, not a requirement.
- Two addresses for one read share a cache entry, so a purge or a fresh read fills both.
- A change to the base path touches `src/core/urls.ts` and `wrangler.jsonc` together;
  `astro.config.ts` reads the constant, and `test/wrangler-config.test.ts` fails if the two drift.
- Retiring the old host means removing its route, the legacy branch in `src/core/route.ts`, and the
  old-host tests.
