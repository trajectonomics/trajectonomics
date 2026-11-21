# Trajectonomics brand: fonts

The Brand Typeface for the `trajectonomics` brand: Inter Variable, Aleo and Azeret Mono as vendored
latin woff2 subsets, with `brand.css`, the source of the `@font-face` rules. `packages/brand`'s
build (`scripts/build.ts`) copies them, together with the logo and the Favicon Set from the
sibling `svg/` folder, into `dist/brands/trajectonomics/`. When this brand is the one `BRAND`
selects, the build also copies them into `dist/current/`.

## What an app imports

Apps import the selected brand through `@trajectonomics/brand/current/…`, so the same code builds
every brand. Use `…/brands/trajectonomics/…` only to name this brand explicitly.

| Path under `current/` | What it is |
| --- | --- |
| `logo/mark.svg`, `logo/wordmark.svg` | The mark and the wordmark in `currentColor`, for inlining. |
| `logo/mark-on-light.svg`, `logo/mark-on-dark.svg` | The mark in black or in white, for `<img>`. |
| `logo/wordmark-on-light.svg`, `logo/wordmark-on-dark.svg` | The wordmark in black or in white, for `<img>`. |
| `logo/mark-tile.svg` | The mark on its filled tile, which follows `prefers-color-scheme` by itself. |
| `favicon/favicon.svg`, `favicon/favicon.ico` | The favicon, as SVG and as a 16/32/48 px ICO. |
| `favicon/apple-touch-icon.png`, `favicon/icon-192.png`, `favicon/icon-512.png` | Home-screen and manifest icons. |
| `fonts/inter.css` | `@font-face` rules for `"Inter Variable"`, one per subset. |
| `fonts/brand.css` | `@font-face` rules for every brand family, plus a metric-matched fallback family for each. |
| `fonts/*.woff2` | The subsets: Inter latin and latin-ext (wght 100–900), Aleo 300 and 400, Azeret Mono 500. |

For example, the docs app loads `@trajectonomics/brand/current/fonts/inter.css`, and the site
copies the woff2 files from `@trajectonomics/brand/current/fonts/` with `scripts/copy-fonts.ts`.

## Licences

The typefaces are under the SIL Open Font License 1.1 (`INTER-OFL-1.1.txt`, `ALEO-OFL-1.1.txt`,
`AZERET-MONO-OFL-1.1.txt`). The logo, wordmark and favicon are proprietary (`NOTICE`: all rights
reserved). A white-label brand under `brands/<name>/` brings its own art and its own licences.

## Changing a font

Replace the woff2 file under the same name, or add a subset to `scripts/brand-typeface.ts` and
`brand.css` together. `bun run check` in `packages/brand` then rebuilds every brand and runs the
per-brand tests (`brands/brands.test.ts`), which fail when a required asset is missing.
