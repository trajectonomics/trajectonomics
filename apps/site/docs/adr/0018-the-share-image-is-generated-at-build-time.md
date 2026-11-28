---
status: accepted
---

# The share image is generated at build time

> **Superseded in part on 2026-11-28.** The home card now draws the answer as a picture instead of
> the value statement ([ADR 0035](./0035-the-home-share-card-shows-the-answer.md)). The OpenJot card,
> and everything below about generation, colours, type and the head, stay in force.

## Context

A link to the Site unfurled as a bare title and a sentence in Slack, X, LinkedIn and iMessage, and in
the answer engines that read `og:image`. The Social card shipped `twitter:card: summary` for one honest
reason: no 1200 × 630 asset existed, and [ADR 0005](./0005-page-weight-and-web-font-budget.md) holds the
Site to a page weight and a font budget that no hand-drawn picture should be allowed to stretch. The
picture also cannot be drawn by hand without copying copy: the words on it are the Language's own value
statement, and two copies drift.

The Site already generates one binary before every build. `public/hero/pixel-blast.png` is printed by
`scripts/hero-ground.ts` from a seed, and `public/` holds no committed picture ([ADR 0010](./0010-the-hero-carries-a-pixel-blast-field.md)).
That is the shape a share image takes too.

## Decision

- **One PNG per Language, written before every build.** `scripts/share-image.ts` writes
  `public/og/<language>.png`, wired into `predev`, `prebuild` and `prebuild:build:preview` beside
  `copy-fonts.ts` and `hero-ground.ts`. Astro copies `public/` into `dist/`, the Worker serves it, and
  nothing is committed: `public/og/` is ignored for the reason `public/hero/` is.
- **The composition is a Pure Core.** `src/lib/social/` takes the Language's Dictionary, the colours and
  the lockup and returns the SVG that draws the picture, at 1200 × 630: the wordmark, the Language's own
  name, the accent rule, the value statement (`dictionary.description`, the same one line the card
  describes itself with) and the host. Nothing in it reads a clock, a file or the network, and its unit tests
  judge it with no picture at all.
- **The colours are the Theme's, read from the tokens.** `shareColours(tokens)` reads `background`,
  `foreground`, `muted-foreground` and `accent` from the one Theme a production build ships — the dark
  Theme ([ADR 0016](./0016-the-site-ships-the-dark-theme.md)) — and rejects a pinned CSS that publishes
  no such Theme (`SHARE_THEME_MISSING`) or no such role (`SHARE_ROLE_MISSING`). The composition writes no
  colour literal: the four values arrive as data, and its unit test fails on any hex value in the SVG that
  is not one of them.
- **The type is the Brand Typeface, and a run of Thai is set in the face the Theme names.** The statement
  is set in `Aleo` and the meta layer in `Azeret Mono`, the latin subsets the assets package ships. A run
  that carries Thai script is set in `e2e/fonts/NotoSansThai.ttf` instead — the Thai face this repository
  already commits for its visual baselines, and the family the Theme's own sans stack names — because the
  brand cuts carry no Thai glyph and the rasterizer resolves one face per text node, so a Thai sentence
  carrying a Latin word is set in the Thai face, which covers both (`src/lib/social/face.ts`). The
  rasterizer loads those four files and no system font (`loadSystemFonts: false`), so a CI runner and a
  workstation print the same bytes.
- **`@resvg/resvg-js` shapes and rasterizes the picture.** Thai mark positioning included, because a
  browser is not installed where `bun run check` runs. `wawoff2` decompresses the `.woff2` files into sfnt
  first: the rasterizer's `fontdb` reads no `.woff2` and ignores one silently, so the picture would be
  drawn entirely in the fallback face — which is what the first draft of this change shipped until a
  review rendered the same image through the Thai face alone and got the same bytes.
  `scripts/adapters/share-fonts.ts` converts each cut into a gitignored cache, and a test now requires the
  image rendered through every face to differ from the one rendered through the Thai face alone. Both
  dependencies are pinned exactly and neither adds a second lockfile.
- **The head advertises it, and the build is judged on it.** An indexed page carries `og:image` (absolute,
  via the site origin), `og:image:width` (1200), `og:image:height` (630), `og:image:type` (`image/png`),
  `og:image:alt` (the wordmark and the value statement, in that Language's words), `twitter:card:
  summary_large_image` and `twitter:image`. `checkSocialCard` holds every one of them
  (`SOCIAL_CARD_MISSING`, `SOCIAL_CARD_DUPLICATE`, `SOCIAL_CARD_WRONG`), and `checkShareImage` holds the
  files: each Language's image is in the build (`SHARE_IMAGE_MISSING`), opens as a PNG
  (`SHARE_IMAGE_NOT_PNG`), is 1200 × 630 (`SHARE_IMAGE_SIZE_WRONG`) and weighs at most 100,000 bytes
  (`SHARE_IMAGE_TOO_HEAVY`). The size comes from the image's own header, which the adapter reads into
  `BuiltFile.pixels` so the rule stays data in, data out, and no scan reads a PNG as text.

## Considered Options

- **An SVG `og:image`.** Rejected. Slack, X, LinkedIn and iMessage rasterize nothing: an SVG is either
  ignored or rendered as a blank card, which is worse than the `summary` card that shipped.
- **A committed PNG.** Rejected. The repository commits no generated binary — the hero tile, the Brand
  Typeface and this picture are all written by a prebuild step — and a committed picture is a second
  copy of the words that cannot be checked against the Dictionaries.
- **Drawing the picture with a browser.** Rejected. Chromium renders the page's own fonts and shapes Thai
  correctly, but the shared check installs no browser; only `browser.yml` does. A prebuild step that needs
  one would fail `bun run check` and pass the browser workflow, which is the wrong way round.
- **`sharp`, already in the tree through Astro.** Rejected. libvips draws text through fontconfig, so the
  Brand Typeface would have to be installed on the machine rather than passed in, and fontconfig reads
  neither `.woff2` nor a font file a caller hands it.
- **A package that measures text for the wrapper.** Rejected for now: the statement breaks at a character
  budget (`STATEMENT_LINE_CHARS`) instead of a pixel width, because measuring needs the font's own metrics
  and the Pure Core does not read the font. The budget is set so both Languages' statements set in three
  lines with room at the margin, and a test renders both images and fails if any ink falls outside the
  margins — so a third Language that overflows is a red build rather than a cropped picture, and one look
  at the render sets its numbers.

## Consequences

- A share of any Language home unfurls with the Site's own picture, in the Theme's colours, in that
  Language's words.
- The picture is one more thing the prebuild step writes; a missing `prebuild` shows up as
  `SHARE_IMAGE_MISSING` on a scan, not as a card without an image in production.
- [ADR 0005](./0005-page-weight-and-web-font-budget.md) is untouched: the image is a crawler's fetch, not
  a page subresource. It is referenced by a `meta` and by no stylesheet, no `src` and no `url()`, so the
  page weight, the Program JavaScript and the font budget measure exactly what they measured before.
  The ceiling on the image itself is this record's: 100,000 bytes, checked on the build.
- A new Language is one Dictionary file and one render: its image, its alt text and its four `og:image`
  properties follow with no edit to this picture's code.
- The rendered pair is committed under `docs/screenshots/` as a design capture, as the restyle's captures
  are ([ADR 0007](./0007-landing-page-restyle-twenty-language.md)), and not in `public/`, where the build
  writes the pictures it serves.
