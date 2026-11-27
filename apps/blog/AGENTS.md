# AGENTS.md

Read the root [AGENTS.md](../../AGENTS.md) first. This file holds only what is specific to `apps/blog`, the blog at `https://trajectonomics.com/blog/`.

## Rules

1. Done means `bun run check` passes in `apps/blog`: Biome with zero warnings, `tsc` and `astro check`, tests, the build and `verify:build`. Do not loosen `tsconfig.base.json` or `biome.json` to make an error go away.
2. The blog is served under the Site's host at `/blog/` by the `blog` Worker: Static Assets under `assets.base_path`, plus the smallest script, which redirects the old host ([ADR 0004](docs/adr/0004-the-blog-is-served-under-the-sites-host.md)). No router. It is never published to npm.
3. No colour literal: paint from the brand's Theme roles (`--ds-color-*`). A test fails any literal in a stylesheet or a component.
4. Keep the checks in `src/lib/` pure (data in, data out). File and network access lives in `scripts/`.
5. Style every page against [`docs/design/blog.md`](docs/design/blog.md). A change a reader can see is a Surface ticket: its pull request commits the screenshots `bun run screenshots` writes and merges only on the owner's approval.
6. Every fact in a Post links to its source, and every number comes from a run anyone can repeat. Never invent one.
7. The Verdict and each row's better side on a Compare Page are the owner's to write. An agent never writes or rewords them; it leaves the Placeholder and asks.
8. A Post is a folder: `src/content/posts/<slug>/<language>.md`, one file per Translation. Never add a flat `<slug>.md`; the build refuses it. A new Translation keeps `type`, `publishedOn`, `draft` and the cover's `src` and size identical to the others, and links to other Posts in its own Language Tree (`/blog/th/guides/...` from a Thai Translation). The Interface Language and a Post's Languages are separate ([ADR 0003](docs/adr/0003-interface-language-and-post-language-are-separate.md)).
