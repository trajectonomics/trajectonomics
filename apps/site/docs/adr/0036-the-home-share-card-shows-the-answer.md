---
status: accepted
---

# The home share card shows the answer as a picture

The home card used to print the Language's value statement under the wordmark: a paragraph on a
1200 × 630 canvas. [DESIGN_PRINCIPLES.md](../../../../DESIGN_PRINCIPLES.md) puts the picture on the first
rung and every word below it, and the card has one job a shared link gets a glance at: answer "when
can I stop working?". [ADR 0018](./0018-the-share-image-is-generated-at-build-time.md) still owns how
the card is generated and advertised; this record changes what its home half shows. The OpenJot card
keeps ADR 0018's composition, and `composeShareImage` is untouched.

## Decision

- **Everything the card draws.** The card draws the wordmark, the host, the question, the line, the
  date, the label, the two years and the mascot, and nothing else. The top row keeps the brand lockup
  at the margin and moves the host to the top-right corner; the Language name no longer appears. The
  Language's own `actionQuestion` sits at 44 px, and under it the net-worth line answers it. Every
  word pays rent.
- **A line, not figures.** The curve is drawn from `netWorthShape(u)`: a rising
  exponential through the working years, then a levelling exponential once the person is free to
  stop, joined with no step at the FI date. No y-axis or amount is shown. The line is illustrative;
  the only figure the picture takes from the demo is its FI date, on the demo's time axis. The
  working half is `muted-foreground`, the free half `accent`, with a 12 % accent area under it, so
  the free part is the focal point.
- **The time axis and the date are the demo's own.** The axis runs from `FI_DEMO_AS_OF` to
  `FI_DEMO_HORIZON` at the chart's two ends, labelled with their years. The orange knee sits at
  `FI_DEMO_DATE`'s UTC day position between them (`dateFraction`), never at a written fraction.
  `shortMonthYear` reads the Language's own short month names from the Dictionary (`shareMonths`),
  because `Intl` in Thai writes a Buddhist year.
- **The words sit where the curve is not.** "Aug 2041" at 40 px and its `shareFreeLabel` beneath it
  are both end-anchored to the left of the knee and set above it (`KNEE_DATE_ABOVE`,
  `KNEE_LABEL_ABOVE`). The first draft put the label below the knee, where its descenders met the
  grey curve rising into the marker; placing both above keeps every glyph clear.
- **The alt text describes the picture.** `shareImageAlt` reads
  `${SITE_BRAND_NAME} — ${actionQuestion} ${shareChartAlt}`, the template filled with the localised
  date and the free label, so a screen reader hears the picture's answer. The OpenJot alt is
  unchanged.
- **Pure modules, one concern each.** `chart-layout.ts` holds the chart's box, axis, shape and
  sample count; `share-date.ts` the UTC day maths and the month-year formatter; `share-curve.ts` the
  sampled points and path data; `share-text.ts` the text runs in the face a script asks for;
  `share-mascot.ts` where the robot stands and the line it stands on; and `share-chart.ts` the
  composer `shareImage()` calls. Each stays under the one-file line limit, and none reads a clock, a
  file or the network.
- **The checks hold the picture.** Unit tests walk `netWorthShape` for monotonicity, continuity and
  range; the home-card tests hold the question, the host, the live date, the two stroke paths and
  their colours, the knee's position within a pixel of the date's share of the axis, the margin box,
  and XML escaping. The mascot's own tests hold its feet on the baseline, its right edge at the
  margin, its 24 px clear space from the chart and from the host line, its own aspect and its PNG
  data URI, and the OpenJot card is held to no `<image>` at all. The rasterised PNG stays under
  `SHARE_IMAGE_MAX_BYTES` (about 75 KB), and the committed cut-out under 45 KB.

## The mascot points at the answer

A card whose only figure is a date reads better with the character beside it: the robot stands on
the baseline the chart starts from, in the space the curve leaves free, and points back at
"Aug 2041".

- **One new pose, `point`.** Antigravity (`gemini-4-hydrogen`) generated it on 2026-11-28 from the
  Site's own poses as character references, on the same flat `#00FF00` screen and from the same
  character wording as [ADR 0026](./0026-the-mascot-is-a-rendered-cut-out.md).
- **Keyed the same way.** The screen is cut out offline with ADR 0026's method: alpha is a smoothstep
  of how much greener than red and blue each pixel is, despill caps green at the red and blue mean
  plus 4, the matte erodes by one pixel, and the result is trimmed to the content's bounding box.
  The cut-out is committed at `src/lib/social/assets/mascot-point.png`, 204 × 273 px, its colour
  quantised to 6 bits a channel, 31,977 bytes.
- **It stands on the line, right of the chart.** `CHART_RIGHT` moves to 900, so the "2066" label ends
  clear of the robot, and the baseline runs on from `CHART_LEFT` to the margin at 1128 so the robot
  stands on it. `share-mascot.ts` puts the image's bottom edge on `CHART_BASELINE` and its right
  edge at the margin, at most 290 px tall and never closer than 24 px to the chart, so the pointing
  hand reaches toward the curve and "Aug 2041" without covering either.
- **The composer stays pure.** Its input gains `ShareMascot { width, height, href }`, where `href`
  is a `data:image/png;base64,...` URI. `scripts/adapters/share-mascot.ts` reads the committed PNG
  and its pixel size from the IHDR bytes, and `scripts/share-image.ts` passes it in; the SVG draws
  one `<image>`, which resvg embeds. Only the home card gets it.
- **It is decoration.** The alt text does not mention it.

### The brief

> Use your image generation tool to create one image. The character is the small cute robot mascot
> in `cover.webp` and `with-traj.webp`: soft matte cream 3D body like smooth vinyl or clay, a
> rounded rectangular head, a glossy black visor with two glowing round orange eyes, a thin black
> antenna with a small orange ball, short stubby arms and legs. Soft studio lighting, gentle
> shadows, very cute and friendly. Background: perfectly flat, uniform, pure chroma-key green
> (#00FF00), no gradient, floor, shadow, scenery or text, and no green on the robot. Square,
> centred. The pose: standing, turned slightly to its right, one arm pointing up and to its right as
> if at a milestone on a chart, the other hand on its hip. Proud.
