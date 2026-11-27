---
status: superseded by [ADR 0017](./0017-the-portal-is-served-under-the-sites-host.md)
---

# The Docs Portal is served on its own host

The Docs Portal is `https://docs.trajectonomics.com`. Pages live at the root of that host (`/cli/`, `/contribute/`), and the build lands in `dist/`. This supersedes the path-prefix half of [ADR 0006](./0006-docs-portal-through-the-microfrontend-router.md): Astro's `base` is `/`, and the Worker attaches `docs.trajectonomics.com` as a custom domain. It still does not attach the apex.

`https://trajectonomics.com/docs` and everything under it stay reachable. The router keeps forwarding that mount to this Worker, and the Worker answers it with a 301 to the same path on `docs.trajectonomics.com`, with `/docs` removed. A retired `/developers` path under that prefix resolves in the same redirect. A request that already names this host, or a preview host, only drops the prefix. The router's mount leaves `Location` alone when it does not strip the prefix, so the 301 reaches the browser unchanged.

The way back to the Site is `https://trajectonomics.com/`. `/` on this host is the Landing Page. The Portal publishes its own `robots.txt` and sitemap; the Site's file no longer describes these pages.

## Considered options

- **Keep `/docs` on the subdomain** (`docs.trajectonomics.com/docs/cli/`). The host already says docs, so the prefix would be a second copy of the same word, and every link, twin and sitemap URL would still carry it.
- **Serve the Worker at `/` and let the router strip `/docs`.** That puts the public hostname back on the apex router. The owner asked for `docs.trajectonomics.com`, which the Worker can attach itself.
- **Drop the apex mount when the subdomain goes live.** Old links would 404 until something else redirected them. Keeping the mount, and redirecting from this Worker, makes the old URLs work on the deploy that changes the paths.
