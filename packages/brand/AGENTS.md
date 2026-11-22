# AGENTS.md

Read the root [AGENTS.md](../../AGENTS.md) first. This file holds only what is specific to `packages/brand` (`@trajectonomics/brand`), the white-label brand folders, themes and assets. It is not published to npm.

## Rules

1. Tests run with `bun test`. Every folder under `brands/` is covered by `brands/brands.test.ts` automatically: adding a brand needs no test changes.
2. Done means `bun run check` passes in `packages/brand`: Biome lint with zero warnings, strict typecheck, tests and build (`scripts/build.ts`: every brand's CSS and assets, plus `dist/current/` for `BRAND`). Do not loosen `tsconfig.base.json` or `biome.json` to make an error go away.
3. Do not edit `version` in `package.json`: this package is not published, and a first-publish bump is never committed.

## Review conventions

The root [CODING_STANDARDS.md](../../CODING_STANDARDS.md) applies, with one difference: the file-length ceiling in this package is 250 lines per file (enforced by Biome), not the 100-line default.
