# ADR 0002: The blog is static Astro under /blog, served by one Worker behind the router

## Status

Accepted, 2026-11-21.

## Context

The owner asked for a blog at `trajectonomics.com/blog` for search, with compare pages first
(trajectonomics/factory#120, its Spec in the archived trajectonomics/blog#1). The Spec copied the
Docs Portal's shape: a path prefix mounted by the router. On 2026-11-21 the Docs Portal moved to its
own host, `docs.trajectonomics.com` (docs ADR 0013), so that precedent no longer holds for docs.

## Decision

- The blog stays on the apex at `/blog`. A subfolder shares the apex's standing with search engines,
  which is what the blog is for; the docs move was about a reference site, not about search.
- Astro builds static HTML with `base: "/blog"`, `trailingSlash: "always"` and `outDir: ./dist/blog`,
  so `/blog/...` resolves under the assets root `./dist`.
- One Worker named `blog` serves every collection, with Static Assets only: no script, no routes,
  no custom domain, `html_handling: "auto-trailing-slash"`, `not_found_handling: "404-page"`.
- The router mounts it with a service binding and `stripPrefix: false` (web-router#22). The blog
  sets no content security policy that would block the router's inline style and script, and never
  serves `/__mf-preload.js`; `verify:build` fails either.
- It deploys from this repository's CI like the Site and the Docs Portal (`.github/workflows/deploy.yml`),
  not through Workers Builds.
- Both Themes follow the device, with `light` when JavaScript is off. This differs from the Site's
  production build, which ships dark only; the owner decided it for the blog in factory#120.

## Consequences

- `/blog/` answers on the Worker's `workers.dev` address from its first deploy, and on the apex once
  the router's route lands.
- The Language resolver stays in the router (web-router#21): the blog never resolves a Language.
- Moving the blog to a host of its own later means changing `base` and adding a redirect, as the
  Docs Portal did.
