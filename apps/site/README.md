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
| `bun run build` | Build the Site into `dist/` |
| `bun run verify:build` | Check the built pages: a home per Language and a Not-found page per Locale URL, one `head`, `body`, `nav` and `main` each, no document at `/`, absolute `hreflang` and `x-default`, the switcher, `noindex` on misses, no downloaded font, no Reserved preload path, no content security policy, no third-party resource |
| `bun run probe:status` | Start `wrangler dev` with no Cloudflare credential and check `/` redirects by Visitor signal, both Locale URLs are 200, a miss under a Locale URL is 404 in that Language, and `/__mf-preload.js` is 404 |
| `bun run test` | `bun test` over `src` and `scripts` |
| `bun run typecheck` | `tsc` plus `astro check` |
| `bun run lint` | Biome, warnings as errors |
| `bun run format` | Rewrite formatting and import order |
| `bun run check` | Lint, typecheck, test, build, `verify:build`, `probe:status` |
| `bun run skills:check` | Verify installed agent skills against `skills-lock.json` |
| `bun run skills:update` | Update installed agent skills |

## The build

`dist/th/index.html` and `dist/en/index.html` are the two Language homes, and there is no document at `/`: the Worker's only script answers `/` with a 302 to the chosen Locale URL ([ADR 0003](./docs/adr/0003-thai-and-english-from-visitor-signals.md)). `dist/404.html` is the English Not-found page, `dist/th/404.html` the Thai one and `dist/en/404.html` the English one under its own Locale URL, so the assets handler's nearest-`404.html` rule answers a miss in the Language of the Locale URL the visitor tried. The built files are the source of truth for the structure rules, not HTML fetched through the router.

The header, hero and footer are placeholders until that ticket replaces them, and the strings only the owner may write stay `[OWNER TO WRITE]` in both Dictionaries until the owner-written ticket. Deployment is a later change.

## License

[MIT](./LICENSE)
