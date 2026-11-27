# ADR 0001: Static pages plus a cached read API; data never triggers a rebuild

## Status

Accepted, 2026-11-25. Slice 2a of issue #592. The public paths moved under `/data/` on
`trajectonomics.com` ([ADR 0006](0006-the-data-site-is-served-under-the-sites-host.md)); the old
host keeps answering them.

## Context

The data site publishes numbers that change every hour. A static build for every ingest would tie
freshness to a deploy, spend build minutes on unchanged pages, and make a backfill rebuild the site
many times. The architecture update of 2026-11-25 keeps the public pages static and puts the
changing numbers behind a read API.

## Decision

- The Worker `data` serves static pages from `public/` (slice 2a ships a placeholder; slice 2b adds
  the overview page) and answers `/ingest`, `/api/usage` and `/api/health` from the same Worker.
- `GET /api/usage` reads `rollup_daily` and is cached in the Workers Cache API for one hour, with
  `stale-if-error=86400`. A cached copy is served when D1 fails.
- Ingest recomputes the affected days' rollups in D1. It never starts a build, a deploy, or a
  static-page regeneration.
- Every usage response carries `methodVersion`, so a change in how numbers are computed can be
  named rather than hidden.

## Consequences

- A new ingest is visible without a deploy, at most one cache lifetime after it lands, or
  immediately after a cache purge.
- The pages read the API in the browser; a reader with JavaScript off sees the page shell and the
  freshness line, not the charts. That is acceptable for an internal pilot and is revisited with
  the overview page.
- A computation change that alters past numbers needs a `methodVersion` bump. Old cached responses
  may still name the old version for up to an hour.
- The Worker has no build step beyond `wrangler deploy`; the static pages are committed source.
