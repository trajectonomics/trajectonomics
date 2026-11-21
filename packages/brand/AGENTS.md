# AGENTS.md

Read the root [AGENTS.md](../../AGENTS.md) first. This file holds only what is specific to `packages/brand` (`@trajectonomics/brand`), the white-label brand folders, themes and assets. It is not published to npm.

## Rules

1. Pure packages use `bun test`; Svelte packages may use Vitest through `bun run test`.
2. Done means `bun run check` passes in `packages/brand`: Biome lint with zero warnings, strict typecheck, tests, build, publint and are-the-types-wrong. Do not loosen `tsconfig.base.json` or `biome.json` to make an error go away.
3. Do not edit `version` in `package.json`: this package is not published, and a first-publish bump is never committed.

## Review conventions

The root [CODING_STANDARDS.md](../../CODING_STANDARDS.md) applies, with one difference: the file-length ceiling in this package is 250 lines per file (enforced by Biome), not the 100-line default.
