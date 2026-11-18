---
status: accepted
---

# The hero's rim brightens the field outside the copy, and the 0.30 cap holds only behind it

The owner asked for the hero's background to stand out more without stealing attention from the headline, the
line [ADR 0014](./0014-the-hero-field-leaves-the-centre-and-the-headline-is-regular.md) drew when the field
left the centre. Three consultants — Gemini 4 Hydrogen, Mistral Large 4 and Grok 4.7 — were asked separately
and landed on the same direction: keep the tile and the colour, and add one layer one size up and about twice
as strong, held to the sides. This amends [ADR 0010](./0010-the-hero-carries-a-pixel-blast-field.md)'s field
shape and strength and [ADR 0014](./0014-the-hero-field-leaves-the-centre-and-the-headline-is-regular.md)'s
clearing, and it lifts the peak of [ADR 0013](./0013-the-hero-ripples-on-click-and-holds-still-on-hover.md)'s
ripple from 0.55 to 0.7.

## Decision

- **One more layer, `.hero-blast-rim`, inside the drift wrapper.** It sits beside `.hero-blast-pixels` in
  `.hero-blast-drift`, so it drifts with the squares, the reduced-motion kill switch in `motion.css` stops it
  with them, and it costs no request: it masks `public/hero/pixel-blast.png`, the tile the build already
  prints. Its rules live in `src/styles/rim.css`, because `blast.css` would pass the file ceiling.
- **The same tile, one size up.** `mask-size: 1530px 1530px` draws a 9 px square against the field's 6, so
  the rim reads as the same material at a larger grain rather than as a second pattern. It paints the same
  `accent` role, so there is no colour literal, no new asset, and both Themes follow the token.
- **Stronger than the field: 0.55 in the light Theme, 0.62 in the dark one.** The field keeps its 0.30 and
  0.34 untouched. The rim is ADR 0014's clearing turned inside out: a radial ellipse of 480 px by 420 px at
  50% by 48%, transparent to 85% of its radius and opaque at 100%. It is sized in pixels because the copy is
  bounded in pixels — the headline is at most 56 rem wide and the subline and the install window 36 rem — so
  the same rule clears 1280, 2000 and a phone alike. A linear band keeps the hero's own first 12% empty,
  which is where the fixed header's links sit; the layer is inside the drift wrapper, which is inset 6%, so
  the band's 17% is the hero's 12%.
- **Why the cap does not apply here.** 0.30 and 0.34 are not a law about the field. They are the strongest
  composite axe allows behind the hero's text, and WCAG 1.4.3 governs text. The rim is never behind text: it
  is transparent through every line box of the copy, on the desktop and on the phone, in both Languages. That
  is measured rather than argued — `e2e/rim.e2e.ts` takes a screenshot of the hero with only the rim
  painting, and counts the copy's line-box pixels that differ from the ground. At 1280x800 and at 390x844, on
  both homes, the count is zero and the worst channel delta is 0, so the rim keeps a pixel of margin
  everywhere, on the wrapped phone copy most of all.
- **axe does not see the rim, and that is deliberate.** axe composites an element's `background-color` over
  its whole box and cannot read a mask, so a rim element would be composited behind the copy and the cap
  would come back by arithmetic rather than by measurement. The rim therefore paints its squares in
  `.hero-blast-rim::before`, a pseudo-element axe does not stack. The field keeps painting its 0.30 in a real
  element, so axe still judges the copy against the ground the copy actually sits on; the rim's own rule is
  the pixel test above. axe reports no violation on either home at 1280x800 and at 2000x1000, in both device
  schemes.
- **The ripple's peak rises to 0.7.** It is the same `accent`, it rides the same clearing, and its strongest
  frame is a response to a click, not ambient. axe settles the page with reduced motion, so it reads the
  ripple's resting opacity of 0, as it did at 0.55.
- **The bottom fade stays.** The rim's band fades out above the hero's last tenth, and `.hero-blast` keeps
  the fade into the next section, so the join ADR 0010 recorded is still one flat colour in both Themes.
- **What is not shipped.** No new JavaScript, no pointer light (ADR 0013), no second colour, no band of its
  own, no glow wash. The page grows by 92 gzip bytes (87 of stylesheet, 5 of HTML), far inside its 50,000.
- **The phone keeps the field it had.** A phone's copy fills the hero: the clearing covers its whole width,
  so the rim has no room beside it, and below the copy the field's own thinning has already reached zero.
  The 390 px captures are byte-for-byte the ones before this change, and that is the honest outcome of
  holding the rim off the copy, not an oversight.

## Considered Options

- **Raise the field's opacity everywhere, 0.30 to 0.55.** Rejected: ADR 0014's clearing is soft — transparent
  to 62% of its radius and opaque at the edge — so a brighter field brightens the fringe under the subline
  and the install window before a single square reaches the sides. The copy is what the cap protects, and
  that fringe is the copy.
- **Split the rim into two side panels, whose boxes miss the copy.** Rejected: it is honest to axe, but it is
  two elements where the design is one layer, and each panel would need its own inner fade, so the clearing
  would live in two places and drift.
- **Give the rim a `background-image` so axe reports the copy as unjudged.** Rejected: it would take the
  hero's copy out of axe's contrast judgement entirely — the copy would stop being held to anything, and the
  field's 0.30 would stop being the bound ADR 0010 measured.
- **A glow wash behind the field.** Rejected: it brightens the same fringe the copy sits on and adds no
  grain, so it competes with the headline instead of framing it.
- **A second colour for the rim.** Rejected: the hero carries one voice, the `accent`; a second hue behind
  the copy pulls the eye off the headline, which is the thing this change must not do.
- **A pointer light.** Rejected already by ADR 0013: the owner found a hover effect annoying.
- **The larger squares at the field's 0.30.** Rejected: at that strength the rim reads as a blur rather than
  as a rim, and the owner would see no change.

## Consequences

- `hero.test.ts` holds the layer's place: one `.hero-blast-rim`, inside the drift wrapper, beside the
  squares.
- `e2e/rim.e2e.ts` holds the rule measured, with `e2e/copy-lines.ts` the way to ask it again.
- The desktop visual baselines move by about 1.8% of their pixels; the phone baselines and the Not-found
  baselines do not change at all, byte for byte.
- The evidence is `docs/screenshots/hero-rim-{before,after}-{1280,390}-{light,dark}.png`, captured from the
  same preview build at the same viewports, so the pair differs by the rim and nothing else.
- axe at 390x844 reports the same two findings with the rim and without it — `scrollable-region-focusable` on
  the prompt's `pre`, and a color-contrast run it cannot judge — so neither belongs to this change. Neither
  is in CI's path either: `e2e/accessibility.e2e.ts` runs at the desktop viewport.
- The clearing is the one knob. Widening it pushes the rim further to the sides; narrowing it lets the rim
  creep towards the copy, and `e2e/rim.e2e.ts` fails before it touches a line box.
