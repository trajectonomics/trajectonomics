# ADR 0002: The blog is static Astro on its own host, blog.trajectonomics.com

## Status

Accepted, 2026-11-22. Replaces the first version of this ADR (2026-11-21), which mounted the blog
at `trajectonomics.com/blog` behind the router.

## Context

The owner asked for a blog with compare pages first (trajectonomics/factory#120, its Spec in the
#140, moved here from the archived blog#1). The Spec mounted it at `/blog` through the router, copying the
Docs Portal. On 2026-11-21 the Docs Portal moved to its own host (docs ADR 0013). On 2026-11-22 the
owner moved the blog the same way: `blog.trajectonomics.com`, with no microfrontend.

## Decision

- The blog is the root of `blog.trajectonomics.com`. Astro builds static HTML with no `base`,
  `trailingSlash: "always"`, into `./dist`.
- One Worker named `blog` serves every collection, with Static Assets only: no script,
  `html_handling: "auto-trailing-slash"`, `not_found_handling: "404-page"`. It attaches
  `blog.trajectonomics.com` as a custom domain on deploy, as the Docs Portal attaches its host.
- The router is not involved, so the router's rules (no content security policy, no
  `/__mf-preload.js`, every file under one prefix) no longer bind the blog.
- The blog publishes its own `robots.txt` and `sitemap.xml`.
- It deploys from this repository's CI like the Site and the Docs Portal
  (`.github/workflows/deploy.yml`).
- Both Themes follow the device, with `light` when JavaScript is off. This differs from the Site's
  production build, which ships dark only. The owner decided it for the blog in factory#120.

## Consequences

- `blog.trajectonomics.com` answers from the first deploy. It needs no route in `web-router`, so
  web-router#22 is not needed.
- The Language resolver cannot come from the router (web-router#21): the Language and SEO ticket
  decides how the blog picks a Language on its own host.
- A subdomain earns its own search standing instead of sharing the apex's. The owner chose this.
