# @trajectonomics/blog

The Trajectonomics blog at [trajectonomics.com/blog](https://trajectonomics.com/blog/): static
[Astro](https://astro.build) with Tailwind and a Markdown content collection, served by the Worker
`blog` at the Site's `/blog/` path, with Static Assets under `assets.base_path`. The smallest Worker
script answers the old blog host with a permanent redirect to the new address
([ADR 0004](./docs/adr/0004-the-blog-is-served-under-the-sites-host.md)). It is never published to npm.

**Status:** the Shell, the front page, the Post page, English and Thai Language Trees, and the
first Posts. The type filter, the compare template, structured data and the first Compare Page
(`traj` vs vanilla agents) follow.

## Write a Post

Add `src/content/posts/<slug>/<language>.md`, where `<language>` is `en` or `th`, with `title`,
`description`, `type` (`compare`, `guide` or `news`), `publishedOn`, `cover` (`src`, `alt`,
`width`, `height`) and optionally `draft: true`. Its images go in `public/posts/<slug>/` as WebP, and
a `src` is their public path under the blog's base, such as `/blog/posts/<slug>/cover.webp`. Stamp a
short thumbnail title and optional kicker onto the `1024 × 1024` cover artwork with `bun run cover`
and state the visible words in `cover.alt`.

To translate a Post, add another `<language>.md` in the same folder. Translate `title`,
`description`, `cover.alt` and the body, and keep `type`, `publishedOn`, `cover.src`, the cover's
size and `draft` exactly as the other Translations have them: the build refuses a mismatch.

A `guide` is served at `/blog/guides/<slug>/` in English and at `/blog/th/guides/<slug>/` in Thai. Every Post
has both pages. A page whose Language the Post is not written in shows the English Translation (or
the Post's own Language when there is no English) with a notice, and lists the Languages the Post
is written in ([ADR 0003](./docs/adr/0003-interface-language-and-post-language-are-separate.md)).

## Add an Interface Language

Add the code to `LANGUAGES` in `src/lib/languages.ts`, write `src/lib/dictionary-<code>.ts`, and
add it to the table in `src/lib/dictionary.ts`. The type checker names every word still missing.

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
| `build` | copies the brand's fonts and Favicon Set into `public/`, then builds `dist/` |
| `verify:build` | checks the built files: titles, canonicals and `hreflang` alternates that resolve, the Shell, every image present with alt text, a Not-found Page |
| `cover` | composites a 1–2 line thumbnail title, optional 40 px kicker and brand mark onto a `1024 × 1024` WebP cover (`--in`, `--out`, `--title`, optional `--kicker`, `--shift`, `--size`; needs Playwright Chromium, `ffmpeg` with `libwebp`, and a Thai sans font for Thai text) |
| `screenshots` | builds, then writes `docs/screenshots/<theme>/<page>-<width>.png` at 1280, 2000 and 390 px |
| `test` | `bun test ./src ./scripts` |
| `typecheck` | `astro sync`, `tsc`, then `astro check` |
| `lint` / `format` | Biome check, or Biome auto-fix |

The design brief is [`docs/design/blog.md`](./docs/design/blog.md). Agent rules: the root
[AGENTS.md](../../AGENTS.md), then [AGENTS.md](./AGENTS.md).
