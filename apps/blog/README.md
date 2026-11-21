# @trajectonomics/blog

The Trajectonomics blog at [blog.trajectonomics.com](https://blog.trajectonomics.com/): static
[Astro](https://astro.build) with Tailwind and a Markdown content collection, served by the Worker
`blog` with Static Assets only, on its own host
([ADR 0002](./docs/adr/0002-the-blog-is-static-on-its-own-host.md)). It is never published to npm.

**Status:** the Shell, the front page, the Post page and the first Post, "One answer, every time".
The type filter, the compare template, the Language work and the first Compare Page (`traj` vs
vanilla agents) follow.

## Write a Post

Add `src/content/posts/<slug>.md` with `title`, `description`, `type` (`compare`, `guide` or
`news`), `publishedOn`, `cover` (`src`, `alt`, `width`, `height`) and optionally `draft: true`.
Its images go in `public/posts/<slug>/` as WebP. A `guide` is served at `/guides/<slug>/`.

## Develop

```sh
bun install
bun run dev        # http://localhost:4321/
bun run preview    # the build behind the real Worker config, with wrangler dev
```

## Scripts

| Script | What it does |
| --- | --- |
| `check` | lint, typecheck, test, build and `verify:build`, in that order; the deploy runs it |
| `build` | copies the brand's fonts and Favicon Set into `public/`, then builds `dist/` |
| `verify:build` | checks the built files: titles, canonicals, the Shell, every image present with alt text, a Not-found Page |
| `screenshots` | builds, then writes `docs/screenshots/<theme>/<page>-<width>.png` at 1280, 2000 and 390 px |
| `test` | `bun test ./src ./scripts` |
| `typecheck` | `astro sync`, `tsc`, then `astro check` |
| `lint` / `format` | Biome check, or Biome auto-fix |

The design brief is [`docs/design/blog.md`](./docs/design/blog.md). Agent rules: the root
[AGENTS.md](../../AGENTS.md), then [AGENTS.md](./AGENTS.md).
