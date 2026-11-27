# ADR 0004: The blog is served under the Site's host, at /blog/

## Status

Accepted, 2026-11-27. Supersedes [ADR 0002](0002-the-blog-is-static-on-its-own-host.md).

## Context

On 2026-11-27 the owner decided that every static site is served under one host,
`https://trajectonomics.com`: the Site at `/`, the Docs Portal at `/docs/`, the blog at `/blog/`,
and the data site at `/data/`. Search results and visitors then land on one site instead of
splitting its standing across subdomains. Only a future single-page app gets its own subdomain.

There is no router Worker. The `web-router` repository is retired and its Worker is not deployed.
Cloudflare chooses the Worker by route: the apex is a Custom Domain on the `site` Worker, and each
sub-app's Worker declares zone routes, which take precedence over a Custom Domain on the same
hostname. Each sub-app keeps its own Worker, build, checks and deploy.

## Decision

- The blog is served at `https://trajectonomics.com/blog/`. Astro keeps building into `./dist`
  with `trailingSlash: "always"`, sets `site: "https://trajectonomics.com"` and `base: "/blog"`.
- The `blog` Worker declares the route `trajectonomics.com/blog*` on the `trajectonomics.com` zone,
  and `assets.base_path: "/blog"` serves the root of `./dist` under that prefix. The build is not
  nested under `dist/blog`; paths in `run_worker_first` and `_headers` would use the public path.
- The Worker gains the smallest script, `src/worker.ts`, with `assets.binding: "ASSETS"` and no
  `run_worker_first`: requests under `/blog/` that match an asset are served straight from assets,
  without running the script. Requests outside the base reach the script, which redirects the old
  host and forwards anything else to `env.ASSETS.fetch(request)`. A miss under the base gets the
  Not-found Page from `not_found_handling`: a browser navigation never runs the script, and any other
  request that reaches it is forwarded to the assets, which answer the same page.
- `blog.trajectonomics.com` stays attached as a Custom Domain. The script answers its GET and HEAD
  requests outside `/blog/` with a 301 to `https://trajectonomics.com/blog<path><query>`, and does not add the base a
  second time to a path that already has it. Other hosts, including localhost and previews, serve
  normally.
- The Site owns the host-root files: `robots.txt`, the IndexNow key file and the root favicon. The
  blog stops publishing `robots.txt` and the IndexNow key. Its sitemap stays at
  `https://trajectonomics.com/blog/sitemap.xml` and its `llms.txt` at `/blog/llms.txt`, with every
  URL at its new address.
- Links to the Site are `/`, to the Docs are `/docs/...`, to data are `/data/`, and blog-internal
  links carry the `/blog/` base. Canonical, `og:url`, `hreflang` alternates, the sitemap, `llms.txt`
  and JSON-LD URLs use the absolute new address.

## Consequences

- Every old blog URL answers with a 301 to its new address, so existing links and search results
  keep working while the apex gains the blog's standing.
- The blog keeps its own Worker, build, checks and deploy; only its public address changed.
- The Worker now has a script, so it can no longer be described as Static Assets only. Requests
  under `/blog/` still cost no script run.
- On the old host, a path that already starts with `/blog/` and matches an asset is served there
  without a redirect, because assets answer before the script and `run_worker_first` matches paths,
  not hosts. No published URL ever had that prefix, and every canonical names the apex, so this is
  accepted rather than running the script on every apex request with `run_worker_first: true`.
- An asset reference in the blog is now absolute under `/blog/` (`/blog/posts/...`, `/blog/fonts/...`,
  `/blog/favicon/...`); a root-relative path without the base names a Site-owned file instead.
- The Site's `robots.txt` must list the blog's sitemap; the blog no longer publishes one.
