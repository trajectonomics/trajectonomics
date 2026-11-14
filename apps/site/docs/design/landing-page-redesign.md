# Landing page redesign spec (twenty.com direction)

Status: implemented — the owner picked **variant A (Glow hero)** with EN prefix 1
("The only tool your agent needs for") and the suffixes/Thai shown in the prototypes.
Decisions are recorded in [ADR 0004](../adr/0004-landing-page-redesign.md). Research sources:
live twenty.com plus `github.com/twentyhq/twenty` `packages/twenty-website/src` (tokens, sections,
motion kit), read 2026-06.

## 1. What twenty.com does (condensed findings)

- **Surfaces**: light-first with three schemes — `light` #ffffff, `muted` #f4f4f4, `dark` #1c1c1c —
  ink #1c1c1c, hairlines at 10/20/40% alpha. Our published themes map almost 1:1: `background`,
  `muted`, `border`, `foreground`, `muted-foreground` in both light and dark.
- **One accent**: blue #4a38f5 for eyebrow markers, plus-marks, hovers, focus rings. For us the
  kicker is the published `destructive` red until [design-system#59](https://github.com/trajectonomics/design-system/issues/59)
  ships an orange `accent`.
- **Hero**: muted surface + warm radial glow (`radial-gradient(80% 60% at 50% 40%, …)`), centered
  column with 32px stack gaps, h1 capped at 672px in a light serif with an accent span that swaps
  family, subline 16px muted capped at 591px, CTA row (filled + outlined, 40px tall, mono uppercase
  12px), then a life-size product window (1040×676) that bleeds off the right edge on small screens.
- **Header**: sticky 64px, opaque, hairline border, elevation shadow after 8px of scroll, nav links
  in mono uppercase 12px that turn accent on hover.
- **Type**: weights only 300/400/500; headings tight tracking (-0.02/-0.04em) and `text-wrap:
  balance`; fluid `clamp()` sizes between 390px and 921px viewports.
- **Motion**: durations 150–600ms; easings `standard` cubic-bezier(0.22,1,0.36,1), `smooth`
  (0.4,0,0.2,1), `gentle` (0.16,1,0.3,1), `spring` (0.2,0.8,0.2,1); a global
  `prefers-reduced-motion` kill switch; scroll reveals as rise+scale (200px, 0.88→1) with stagger.
- **Spacing**: 4px grid, gutter 16px/40px, max content 1512px, radius 2px base (20px on the big
  window), shadows soft and large.

## 2. Mapping to this Site's constraints

| twenty.com pattern | here | why |
|---|---|---|
| muted hero surface + glow | hero section on `bg-muted` + radial glow written with `var(--ds-color-*)` | no colour literals allowed; `transparent` and `var(--ds-…)` are the allowed values |
| accent blue #4a38f5 | `text-destructive` (red) now, `text-accent` (orange) after design-system#59 | colour-literal check forbids raw values in the Site |
| serif light h1 with accent span | h1 in `font-light` (300) with the rotating suffix in `text-destructive` | system font stack only, no web fonts |
| life-size product window | a framed "terminal window" card (rounded-2xl, border, shadow) holding the install command | we have no product screenshot; the command is the product |
| sticky header + scroll elevation | `sticky top-0` header, elevation via CSS scroll-driven animation inside `@supports (animation-timeline: scroll())`, hairline border as fallback | landmark check still requires header to paint `background`/`foreground` |
| dark footer stage | not adopted | the landmark-colour check requires `footer` to paint the theme's `background`/`foreground` |
| rAF scroll reveals | CSS scroll-driven `animation-timeline: view()` inside `@supports`, static fallback | 0 JS bytes, compositor-friendly |
| WebGL halftone backdrop | not adopted | cannot meet the JS budget or Lighthouse 0.95; the radial glow carries the mood |
| pointer-reactive light | one small JS layer: a glow div following the pointer with `transform` only, rAF-throttled | the one JS animation, ~0.4 KB |

Contrast note: `muted-foreground` on `muted` is 4.36:1 in the light theme (fails AA 4.5:1), so on a
`bg-muted` hero the subline must use `text-foreground`, or the hero stays on `bg-background` with the
glow on top. The build check decides; variants below assume hero on `bg-muted` with `text-foreground`
subline (variant C keeps `bg-background`).

## 3. Variants (prototypes rendered in the preview browser)

- **A — "Glow hero"**: hero on `bg-muted` with radial glow, centered stack, prefix+suffix h1 with
  red suffix, subline `text-foreground`, terminal-window card with the install command, sticky
  header with scroll elevation, staggered load-in rise, pointer glow (JS).
- **B — "Split hero"**: hero on `bg-background`, left-aligned prefix+suffix h1 (suffix red), subline
  right column or below, command card on the right at ≥md, glow behind; same header/footer polish.
- **C — "Minimal frame"**: current centered layout kept, but with twenty's rhythm: 32px stack gaps,
  fluid h1 clamp, hairline header with elevation, command inside a bordered window frame with
  traffic-light dots (muted tones), load-in fade only, no pointer glow (JS reserved).

All three: same header (sticky, wordmark, Docs, GitHub, switcher), same footer (hairline top,
links left, disclaimer right), both themes, both languages, Thai line-height 1.6, one h1, no other
headings.

## 4. Copy options (shorter; prefix + rotating suffixes; last suffix held without JS)

EN prefix options:
1. "The only tool your agent needs for"
2. "Your agent's money tool for"
3. "One command, and your agent handles"

EN suffixes (cycle, last held): "retirement planning." / "financial projections." / "your future."

TH prefix: "เครื่องมือเดียวที่ agent ของคุณต้องการสำหรับ" ; suffixes: "การวางแผนเกษียณ" / "การคาดการณ์การเงิน" /
"อนาคตของคุณ" (owner reviews Thai).

Subline gets shorter in all variants (drafted with the chosen variant).

## 5. Motion plan (CSS first, one JS layer)

- Load: hero children staggered rise+fade, 600ms `gentle`, delays 0/80/160/240ms. CSS keyframes.
- Headline suffix cycle: existing JS, 2.4s steps, `prefers-reduced-motion` respected.
- Header elevation: `box-shadow` via `animation-timeline: scroll()` (range 0–8px) inside `@supports`;
  fallback hairline border. CSS.
- Pointer glow in hero (variant A/B): one absolutely-positioned radial-gradient div, `transform:
  translate3d` updated on rAF-throttled `pointermove`, disabled under reduced motion. ~0.4 KB JS.
- Global `@media (prefers-reduced-motion: reduce)` kill switch. CSS.
- Budget: JS total stays ≈3 KB of the raised 10,000-byte budget; HTML+CSS gzip stays under 50 KB;
  Lighthouse mobile ≥ 0.95 remains the hard gate in `browser.yml`.

## 6. Open for the owner

1. Pick variant A, B or C.
2. Pick EN prefix + suffixes and approve the Thai.
3. Confirm hero surface: `bg-muted` (subline `text-foreground`) vs `bg-background`.
