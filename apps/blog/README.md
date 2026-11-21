# @trajectonomics/blog

The Trajectonomics blog: Astro with MDX content collections, to be served at
`trajectonomics.com/blog` from Cloudflare Workers Static Assets. It is never published to npm.

**Status: not built yet.** This package is still the technical-template starter (`src/index.ts` is a
placeholder library). The Astro site, its content collection and its Cloudflare worker come later.
Until then it only runs the shared checks.

## Scripts

Run from the repo root with `bunx turbo run <script> --filter=@trajectonomics/blog`, or with
`bun run <script>` inside this folder.

| Script | What it does |
| --- | --- |
| `check` | lint, typecheck, test, build and package lint, in that order |
| `test` | `bun test ./src ./scripts` |
| `typecheck` | strict TypeScript over the source and the tests |
| `lint` / `format` | Biome check, or Biome auto-fix |
| `build` / `lint:package` | tsdown build, then publint and are-the-types-wrong |

Agent rules: the root [AGENTS.md](../../AGENTS.md), then [AGENTS.md](./AGENTS.md).
