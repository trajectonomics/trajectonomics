# @trajectonomics/blog

The Trajectonomics blog at `trajectonomics.com/blog`: static [Astro](https://astro.build) with
Tailwind, built under `/blog` and served by the Worker `blog` with Static Assets only. The router
mounts it at `/blog` ([ADR 0002](./docs/adr/0002-the-blog-is-static-under-blog-behind-the-router.md)).
It is never published to npm.

**Status:** the Shell is built: header, dark footer, both Themes following the device, the front
page with an empty `Latest`, and the Not-found page. The landing list, the compare template, the
Language and SEO work and the first Compare Page (`traj` vs vanilla agents) follow, in that order.

## Develop

```sh
bun install
bun run dev        # http://localhost:4321/blog/
bun run preview    # the build behind the real Worker config, with wrangler dev
```

## Scripts

| Script | What it does |
| --- | --- |
| `check` | lint, typecheck, test, build and `verify:build`, in that order; the deploy runs it |
| `build` | copies the brand's fonts and Favicon Set into `public/`, then builds `dist/blog/` |
| `verify:build` | checks the built files: titles, canonicals, the Shell, no security policy, no `/__mf-preload.js`, nothing outside `/blog/`, a Not-found page |
| `screenshots` | builds, then writes `docs/screenshots/<theme>/<page>-<width>.png` at 1280, 2000 and 390 px |
| `test` | `bun test ./src ./scripts` |
| `typecheck` | `tsc` plus `astro check` |
| `lint` / `format` | Biome check, or Biome auto-fix |

The design brief is [`docs/design/blog.md`](./docs/design/blog.md). Agent rules: the root
[AGENTS.md](../../AGENTS.md), then [AGENTS.md](./AGENTS.md).
