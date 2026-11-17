---
status: accepted
---

# The hero carries a baked pixel-blast field and fills the viewport

The owner asked for the hero's ground to be the `pixel-blast` background from
[sveltebits](https://sveltebits.xyz/backgrounds/pixel-blast), for the hero to be taller than the visitor's
viewport, and for the section under it to be the Theme's own `background` with no seam where the two meet. This
replaces the Ground bullet of [ADR 0007](./0007-landing-page-restyle-twenty-language.md), which removed the hero
band, and the CSS grainient it first carried.

## Decision

- **The field is baked, not run.** `pixel-blast` upstream is a WebGL2 fragment shader driven by `three` and
  `postprocessing`. The Site ships no WebGL backdrop and no shader library in its 10,000-byte script budget
  ([ADR 0004](./0004-landing-page-redesign.md)), so the field is printed once instead: three wrapped octaves of
  value noise, stretched, then ordered-dithered through the 8×8 Bayer matrix to one bit. `scripts/hero-ground.ts`
  writes it into `public/hero/pixel-blast.png` before every build, from a fixed seed, as a 2.8 KB one-bit PNG whose
  palette is transparent then white. The repository commits no binary: the generator is the source of truth.
- **The squares are 6 px.** One cell is one 6 px square of `accent`, so the field reads as pixels rather than as a
  dotted wash, and the tile repeats on a 1020 px grid with wrapped noise, so a repeat has no seam.
- **The ground is a mask, not an image.** `accent` is painted into the mask, so the field follows the Theme with no
  colour in the asset. `src/styles/blast.css` holds the three layers: the tile in `accent`, a linear fade to
  `background` over the hero's first 12% and last 26%, and a radial thinning that keeps the corners empty.
- **The hero is one viewport and 4 rem.** `.hero-stage` sets `min-height: calc(100dvh + 4rem)` inside
  `@supports (height: 100dvh)`, and `calc(100vh + 4rem)` outside it. The header is fixed and overlays the top
  64 px, so the hero's own padding still clears it. A visitor lands on the hero alone, and `e2e/hero.e2e.ts`
  holds that rule on a desktop and a phone.
- **The join is a fade, not a border.** The section below paints `background`, with the `border-t` it used to carry
  removed, so the two meet in one flat colour in both Themes. `main` keeps `muted`, because the Not-found page
  still reads on it.
- **One motion, still.** The field drifts as one transform-only layer, the pointer light follows the pointer, and
  the reduced-motion kill switch in `motion.css` stops both.
- **What is not shipped.** The ripples and the liquid distortion need the live shader: they answer a click and
  warp the field, which a baked tile cannot do. A row of CSS-animated squares was not taken, because it would be
  tens of nodes and a repaint per frame for an effect the drift already suggests.
- **What is measured.** Axe composites the field's colour and its opacity behind the hero's copy, so how strong
  the field may be is held by WCAG rather than by taste: `0.30` in the light Theme and `0.34` in the dark one are
  the most the hero's `muted-foreground` text and its `accent` suffix carry (4.97:1 and 3.29:1 light, 4.88:1 and
  3.54:1 dark). Lighthouse's mobile score stays at 1.00, and the page weighs 13.7 KB gzip of its 50 KB budget,
  with the tile as one extra 2.8 KB request.
