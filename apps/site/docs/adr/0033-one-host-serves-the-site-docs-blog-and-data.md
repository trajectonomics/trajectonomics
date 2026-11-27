---
status: accepted
---

# One host serves the Site, the docs, the blog and the data site

On 2026-11-27 the owner decided that every static site is served under one host,
`https://trajectonomics.com`, so a visitor and a search result land on one site instead of three
subdomains. The Site is at `/`, the Docs Portal at `/docs/`, the blog at `/blog/` and the data site
at `/data/`. Only a future single-page app gets a subdomain of its own. The `web-router` repository is
retired and its Worker is not deployed (verified in Cloudflare on 2026-11-27); there is no router in
front of these Workers.

This record supersedes the router parts of [ADR 0002](./0002-site-worker-with-static-assets.md): the
Site no longer has a view transition injected onto its landmarks, no inline style or script arrives
from someone else, and this repository now declares the public route itself.

## Decision

- **The Site owns the apex Custom Domain.** `apps/site/wrangler.jsonc` declares
  `"routes": [{ "pattern": "trajectonomics.com", "custom_domain": true }]`. The domain was attached by
  hand before this change; recording it in the config means a deploy states the same attachment and
  changes nothing, and a reviewer can see where the address comes from.
- **The other sites are mounted by zone routes, not by a router.** The `docs`, `blog` and `data`
  Workers each declare a zone route (`trajectonomics.com/docs*`, `trajectonomics.com/blog*`,
  `trajectonomics.com/data*`) and build with `assets.base_path` set to that prefix, so Workers Static
  Assets serves each app under its mount. A zone route takes precedence over the apex Custom Domain,
  which is why the Site's assets never see those paths. The old subdomains stay attached, and each
  Worker answers its old host with a 301 to the new path; the data Worker's old host also still serves
  its `/api/*` and `/ingest`.
- **Links are root-relative on a page, absolute in a file read away from it.** A page links `/docs/`,
  `/blog/` and `/data/`, exactly as it links its own paths. JSON-LD and the Answer engine files state
  `https://trajectonomics.com/...`, because a crawler or an agent reads them outside the browser.
- **The Robots file names three Sitemaps.** Every agent group stays as it was; the file adds
  `Sitemap: https://trajectonomics.com/docs/sitemap.xml` and the blog's beside the Site's own, and
  still carries no `Disallow:`, because it speaks for the whole host and three other Workers serve
  under it.
- **The Site reserves the paths it does not serve.** The build fails when it produces a file under
  `/docs`, `/blog` or `/data`, which a zone route mounts on another Worker, or at the Reserved preload
  path `/__mf-preload.js`. The local probe expects all four to be 404 from the Site alone. This keeps a
  local `wrangler dev` run from pretending the Site serves a page it does not, and keeps the build from
  shadowing a mount in the deployed order.
- **The search title names Trajectonomics.** The English document title is
  `Trajectonomics — traj: financial simulation for AI agents` and the Thai one names
  the same brand; both descriptions open with `Trajectonomics`. The head states the brand capitalised
  in `og:site_name`, in the `WebSite` name (with `traj` as its `alternateName`) and in the
  `Organization` name. The visible hero copy and the footer wordmark do not change.
- **No Content-Security-Policy on the Site's pages, yet.** The router used to inject an inline style
  and an inline script, which is why ADR 0002 forbade a policy; nothing injects them now, so a policy is
  possible. This change does not add one, because it changes the address model and the head, and a
  policy needs its own measurement of every page's scripts and styles. The existing rule still allows
  the hosted Demo's scoped policy at `/demo/*` ([ADR 0031](./0031-the-site-serves-the-hosted-demo-with-a-scoped-csp.md))
  and no other.

## Considered Options

- **Keep a router Worker in front of the host.** Rejected: the repository is retired and the Worker is
  not deployed, so the routing would have to be rebuilt for no visitor-visible gain. A zone route per
  app is the platform's own mechanism and needs no code.
- **Serve the docs and the blog from the Site's build.** Rejected: they are separate Astro and
  Fumadocs builds with their own releases, and copying them into this one would make every docs change
  a Site change and give up each app's own deploy.
- **Keep the subdomains as the canonical addresses and redirect the apex paths.** Rejected: the owner
  wants one host for search results and visitors, so the path is the address and the subdomain is the
  redirect.
- **Disallow `/docs`, `/blog` and `/data` in `robots.txt`.** Rejected: the file speaks for the whole
  host, so a `Disallow:` would hide the other Workers' pages too.
- **Add a Content-Security-Policy in the same change.** Deferred, not rejected: it is now possible, and
  it should be measured against the built pages rather than guessed here.

## Consequences

- A visitor reaches every site at one host, and an old subdomain link redirects to its path.
- A link on a Site page is root-relative, so a preview host and the production host render the same
  page; the Answer engine files and JSON-LD remain readable away from the host.
- `bun run check` fails when the build produces a page under `/docs`, `/blog` or `/data`, when the
  Robots file omits any of the three Sitemaps, or when the head loses the brand's name.
- The Site can adopt a Content-Security-Policy in a later change without a router change; until then
  the built-file rule keeps the pages as they are.
- A deploy of the Site no longer depends on a router deploy, and a deploy of the docs, blog or data
  Worker carries its own zone route.
- `wrangler dev` infers the route's hostname, so a local Worker would see `trajectonomics.com` and set
  the production cookie `Domain`, which a browser on `127.0.0.1` refuses. The probe, the Playwright
  server and `bun run preview` pass `--infer-origin-from-routes=false`, so a local run keeps its own
  origin; a hand-run `wrangler dev` needs the same flag to keep the consent cookies.
