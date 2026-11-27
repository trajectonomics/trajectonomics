---
status: accepted
---

# The Portal is served under the Site's host

The owner decided on 2026-11-27 that every static site is served under one host, `https://trajectonomics.com`, so search results and visitors land on one site: the Site at `/`, the Docs Portal at `/docs/`, the blog at `/blog/`, and the data site at `/data/`. Only a future single-page app gets its own subdomain.

This record supersedes [ADR 0013](./0013-the-portal-is-served-on-its-own-host.md), and brings back the path half of [ADR 0006](./0006-docs-portal-through-the-microfrontend-router.md) without the router. The `web-router` repository is retired and its Worker is not deployed (verified in Cloudflare on 2026-11-27). Each app keeps its own Worker, build, checks and deploy; there is no router between them.

## Decision

1. **The Portal's Worker takes the apex `/docs` route itself.** `wrangler.jsonc` declares the zone route `trajectonomics.com/docs*` beside the old custom domain `docs.trajectonomics.com`. Cloudflare chooses the Worker by route: the Site's Custom Domain owns the apex, and the Portal's zone route takes precedence on `/docs` (Workers > Routes). One Worker, one deploy, no service binding.
2. **The build serves `/docs` from the root of its assets.** Astro's `site` is `https://trajectonomics.com` and its `base` is `/docs`; `outDir` stays `./dist`, and the Portal's files are not nested under `dist/docs`. Workers Static Assets `assets.base_path` is `/docs`, so the root of `./dist` answers under the mount. Astro's trailing-slash behaviour is unchanged.
3. **The old host redirects permanently.** Every `GET` or `HEAD` on `docs.trajectonomics.com` answers a 301 to `https://trajectonomics.com/docs<path><query>`. A path that already starts with `/docs/` (or is exactly `/docs`) is not prefixed twice, and a retired `/developers` path resolves to its final target in the same hop. Only the exact old host redirects, so `wrangler dev`, preview hosts and the new address serve normally.
4. **The Portal's URLs are the Site's URLs with `/docs`.** Canonical links, `og:url`, the alternate Markdown links, the Sitemap, `llms.txt`, the Markdown twins and the JSON-LD-free pages all name the absolute `https://trajectonomics.com/docs...` address. Links inside the Portal carry the base; a link to the Site Home is `/`, the blog `/blog/...`, and the data site `/data/...`.
5. **The Site owns the host root.** `robots.txt`, the IndexNow key file and the root favicon belong to the Site. The Portal keeps its own Sitemap at `https://trajectonomics.com/docs/sitemap.xml`, and the Site's `robots.txt` names it. The Portal no longer publishes a `robots.txt` or an IndexNow key of its own.
6. **The Site's cookie choice is genuinely first-party.** [ADR 0016](./0016-the-portal-follows-the-sites-cookie-choice.md) made the Portal read the Site's `traj_consent` and `traj_vid` cookies across hosts. On one host they are first-party to the Portal too; the decision and its code stay as they are.

## Consequences

- Search engines see one host. A search result for the old subdomain reaches a 301 in one hop, then the new canonical address.
- The Portal's Worker answers paths outside `/docs` only with a miss; the Site's Worker owns them. A request the Portal's Worker receives outside the mount is not served from its assets.
- The old host's custom domain stays attached for the redirect, so DNS and certificates for `docs.trajectonomics.com` stay in place.
- The Portal's assets, fonts and search index are fetched from `/docs/_astro/...` and `/docs/api/search.json`; the built HTML and the Worker's twin redirects use the same base.
- `wrangler dev` serves the mount at `http://127.0.0.1:<port>/docs/`, which is the seam the browser tests and the screenshot script drive.
- Astro does not rewrite root-relative links authored in MDX, so a small hast plugin adds `/docs` to a Portal link that lacks it. That keeps the authored pages readable and the built paths correct.

## Considered options

- **Keep the Portal on its own host.** ADR 0013's choice. It splits search results and links across two hostnames, which the owner no longer wants.
- **Restore the router in front of the apex.** The router is retired, its Worker is not deployed, and it would reintroduce a service binding and a second deploy for a prefix that one Worker's route and `assets.base_path` already provide.
- **Host the Portal under `/docs` with a redirect from the subdomain, but keep the build nested in `dist/docs`.** That repeats a prefix the Worker's route already selects, and makes the assets root disagree with the public path of every file. `base_path` keeps the build flat.
