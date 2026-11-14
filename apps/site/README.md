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
| `bun run verify:build` | Check the built pages: one `head`, `body`, `nav` and `main` each, no Reserved preload path, no content security policy, no third-party resource |
| `bun run probe:status` | Start `wrangler dev` with no Cloudflare credential and check `/` is 200 and an unknown path and `/__mf-preload.js` are 404 |
| `bun run test` | `bun test` over `src` and `scripts` |
| `bun run typecheck` | `tsc` plus `astro check` |
| `bun run lint` | Biome, warnings as errors |
| `bun run format` | Rewrite formatting and import order |
| `bun run check` | Lint, typecheck, test, build, `verify:build`, `probe:status` |
| `bun run skills:check` | Verify installed agent skills against `skills-lock.json` |
| `bun run skills:update` | Update installed agent skills |

## The build

`dist/index.html` is the placeholder page and `dist/404.html` is the Not-found page; the Worker answers an unknown path with the latter as a real 404. Both are the source of truth for the structure rules, not HTML fetched through the router.

The page is a placeholder until the header, hero and footer ticket replaces it. Language handling and deployment are later changes; the Scaffold's `/` becomes the Language redirect ([ADR 0003](./docs/adr/0003-thai-and-english-from-visitor-signals.md)).

## License

[MIT](./LICENSE)
