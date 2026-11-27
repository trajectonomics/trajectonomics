---
status: accepted
---

# The Site is static Astro served by a Worker with Static Assets

> **Superseded in part on 2026-11-27.** The router this record names is retired. The Site declares its
> own apex Custom Domain, nothing injects a view transition, style or script onto its pages, and
> `/docs`, `/blog` and `/data` are zone routes to other Workers rather than router mounts. See
> [ADR 0033](./0033-one-host-serves-the-site-docs-blog-and-data.md).

The Site is the page at `/` of trajectonomics.com. The router owns the apex and will bind this Worker by the name `site`. The Docs Portal stays a different Worker, mounted at `/docs`, with its own base. This repository is not published to npm.

The Site is static Astro, built with Bun and Tailwind, with no React and no Fumadocs. Astro has no `base`. The build lands at the assets root. The Worker has no script and no route of its own. It serves that directory with `not_found_handling` set to `404-page` and `html_handling` set to `auto-trailing-slash`, so an unknown path is status 404 and the Not-found page is the body. HTML canonical redirects are not unknown paths.

Each built page has one `nav` and one `main`, because the router injects a view-transition name onto those elements. The Site sets no content security policy, because the router injects an inline style and may inject an inline script. The Reserved preload path is not built here.

## Considered Options

- **Keep the library template and publish to npm.** Rejected. The Site is a page, as the Docs Portal is. A merge must not cut a package release.
- **Give Astro a base, or let unknown paths return 200.** Rejected. The mount is `/`, so paths are already root-relative. Once the router mounts the Site, every unmatched path reaches this Worker, and a miss has to be a real 404.
- **Add a Worker script, a staging environment, or a client-side view transition now.** Rejected for this change. Nothing here reads the request. Deployment, including any staging split like the Docs Portal's, is a later change. The router, not Astro, owns the view transition. Omitting staging does not reject that later split. A later language change may add a script in front of the assets. The 404 status still has to hold after that script exists.

## Consequences

- The router binds `HOME` to the Worker named `site` and routes `/` to it. This repository does not attach the domain.
- The scaffold removes the npm release workflow and the library publish surface. `AGENTS.md` is updated in that same change so it no longer says this repository publishes, and so its check is the Site check.
- The built index page and the Not-found page are the source of truth for the one `nav` and one `main` rule. HTML fetched through the router is not.
