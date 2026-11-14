# Trajectonomics Site

The Site at the root of [trajectonomics.com](https://trajectonomics.com): static [Astro](https://astro.build) built with Bun and Tailwind, served by a Worker with Static Assets. `trajectonomics/web-router` mounts it at `/` and sends `/docs` to the Docs Portal.

This repository is private and never published to npm. The Worker is named `site` and takes no route of its own; the router attaches the public one ([ADR 0002](./docs/adr/0002-site-worker-with-static-assets.md)).

## Develop

```bash
bun install
bun run dev
```

## Scripts

| Script | Does |
| --- | --- |
| `bun run dev` | Astro dev server on a local port |
| `bun run build` | Build the Site into `dist/` as a production build |
| `bun run build:preview` | Build into `dist/` with Astro mode `preview`, which `bun run check` uses so the owner's placeholder may remain |
| `bun run verify:build` | Scan `dist/` with `bun test`: a home per Language and a Not-found page per Locale URL, one `h1`, `main`, `nav` and `head` each, the Docs and cli links, the `hreflang` pair, the three regions, the install command, no document at `/`, no absolute asset, the switcher, `noindex` on misses, no downloaded font, no Reserved preload path, no content security policy, no `npx traj`, and in production mode no `[OWNER TO WRITE]` |
| `bun run probe:status` | Start `wrangler dev` with no Cloudflare credential and check `/` redirects by Visitor signal, both Locale URLs are 200, a miss under a Locale URL is 404 in that Language, and `/__mf-preload.js` is 404 |
| `bun run test` | `bun test` over `src` and `scripts` |
| `bun run typecheck` | `tsc` plus `astro check` |
| `bun run lint` | Biome, warnings as errors |
| `bun run format` | Rewrite formatting and import order |
| `bun run check` | Lint, typecheck, test, the preview build, the built-file scan in preview mode, `probe:status` |
| `bun run skills:check` | Verify installed agent skills against `skills-lock.json` |
| `bun run skills:update` | Update installed agent skills |

## The build

`dist/th/index.html` and `dist/en/index.html` are the two Language homes, and there is no document at `/`: the Worker's only script answers `/` with a 302 to the chosen Locale URL ([ADR 0003](./docs/adr/0003-thai-and-english-from-visitor-signals.md)). `dist/404.html` is the English Not-found page, `dist/th/404.html` the Thai one and `dist/en/404.html` the English one under its own Locale URL, so the assets handler's nearest-`404.html` rule answers a miss in the Language of the Locale URL the visitor tried. The built files are the source of truth for the structure rules, not HTML fetched through the router.

The page shows the three confirmed regions only: the header, the hero with the install command, and the footer ([site#3](https://github.com/trajectonomics/site/issues/3)). The Thai headline, the Thai sub-line and each footer disclaimer stay `[OWNER TO WRITE]` until the owner writes them; the English hero text is confirmed. Screenshots of the built page are in [`docs/screenshots/`](./docs/screenshots/). Deployment is a later change.

The built-file rules are a pure core in `src/lib/build/`, and the scan is `bun test ./test/dist`, which `bun run check` runs after `astro build --mode preview` with `SITE_BUILD_MODE=preview`. A scan named with no mode judges a production build, so a production `dist/` that still holds `[OWNER TO WRITE]` fails instead of shipping. [ADR 0004](./docs/adr/0004-build-output-checks.md) records the design.

## License

[MIT](./LICENSE)
