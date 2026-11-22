# @trajectonomics/brand

The Trajectonomics brand: Design Tokens, the Semantic Token Contract, Themes, Brand Assets and one
folder per white-label brand. Private to this repo, never published to npm.

## Layout

```
src/            tokens (contract, primitives, contrast), theme (defineTheme, themeToCss), brands()
brands/<name>/  one folder per brand: light.ts and dark.ts, assets/{svg,webp,fonts}
scripts/        build.ts and the asset and Tailwind pipelines
tailwind.css, typography.css   brand-agnostic; they only read the --ds-* variables
```

`brands/trajectonomics/` is the default brand. Each `light.ts` and `dark.ts` default-exports a Theme
named `"light"` or `"dark"`. The folder is the brand, and the themes stay `light`/`dark` inside it,
because `themeToCss` scopes them by `data-theme`.

## Build output and the BRAND switch

`bun run build` runs tsdown on `src/`, then writes:

- `dist/index.mjs`: the JS API.
- `dist/brands/<name>/`: `light.css`, `dark.css`, `logo/`, `favicon/`, `fonts/`, for every brand.
- `dist/current/`: a copy of the brand named by `BRAND` (default `trajectonomics`).
- `dist/tailwind.css`, `dist/typography.css`.

Apps import only from `current/`, so `BRAND=<name>` builds the same app as another brand:

```ts
import mark from "@trajectonomics/brand/current/logo/mark.svg?raw"
import "@trajectonomics/brand/current/light.css"
import "@trajectonomics/brand/tailwind.css"
```

`turbo.json` lists `BRAND` in the build task's `env`, so the cache never mixes brands. An unknown
`BRAND` fails the build and lists the brands that exist.

## How to add a brand

1. Copy `brands/trajectonomics/` to `brands/<name>/`.
2. Change the colours in `light.ts` and `dark.ts`. Keep each default export named `"light"` or `"dark"`.
3. Replace the art in `assets/svg/` (`mark.svg` and `favicon.svg` are required) and the fonts in
   `assets/fonts/` (`brand.css` is required). Keep the licence file for every font you ship.
4. Run `bun run check`. The tests in `brands/brands.test.ts` loop over every folder: both Themes
   validate against the Contract, meet the WCAG AA floors, the required assets exist, and every SVG
   passes the safety rules. Nothing else needs registering.
5. Build an app with `BRAND=<name> bun run build`.

A customer's brand lives in a private mirror of this repo that only adds its folder, as §2b of
`docs/monorepo-migration.md` describes. It does not go into this repo.

## Commands

- `bun run test`: all tests, including the per-brand checks.
- `bun run check`: lint, typecheck, tests and build.
- `bun run generate:tailwind`: regenerates `tailwind.css` from the Contract.
