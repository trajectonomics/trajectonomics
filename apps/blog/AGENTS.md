# AGENTS.md

Read the root [AGENTS.md](../../AGENTS.md) first. This file holds only what is specific to `apps/blog`, the blog at `trajectonomics.com/blog`.

## Rules

1. Done means `bun run check` passes in `apps/blog`: Biome with zero warnings, `tsc` and `astro check`, tests, the build and `verify:build`. Do not loosen `tsconfig.base.json` or `biome.json` to make an error go away.
2. The blog is static: no Worker script, no content security policy, never `/__mf-preload.js`, and every built file under `/blog/` ([ADR 0002](docs/adr/0002-the-blog-is-static-under-blog-behind-the-router.md)). It is never published to npm.
3. No colour literal: paint from the brand's Theme roles (`--ds-color-*`). A test fails any literal in a stylesheet or a component.
4. Keep the checks in `src/lib/` pure (data in, data out). File and network access lives in `scripts/`.
5. Style every page against [`docs/design/blog.md`](docs/design/blog.md). A change a reader can see is a Surface ticket: its pull request commits the screenshots `bun run screenshots` writes and merges only on the owner's approval.
6. The Verdict and each row's better side on a Compare Page are the owner's to write. An agent never writes or rewords them; it leaves the Placeholder and asks.
