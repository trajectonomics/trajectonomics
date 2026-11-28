---
status: accepted
---

# The home share card shows the answer as a picture

The home card used to print the Language's value statement under the wordmark: a paragraph on a
1200 × 630 canvas. [DESIGN_PRINCIPLES.md](../../../DESIGN_PRINCIPLES.md) puts the picture on the first
rung and every word below it, and the card has one job a shared link gets a glance at: answer "when
can I stop working?". [ADR 0018](./0018-the-share-image-is-generated-at-build-time.md) still owns how
the card is generated and advertised; this record changes what its home half shows. The OpenJot card
keeps ADR 0018's composition, and `composeShareImage` is untouched.

## Decision

- **Everything the card draws.** The card draws the wordmark, the host, the question, the line, the
  date, the label and the two years, and nothing else. The top row keeps the brand lockup at the
  margin and moves the host to the top-right corner; the Language name no longer appears. The
  Language's own `actionQuestion` sits at 44 px, and under it the net-worth line answers it. Every
  word pays rent.
- **A line, not figures.** The curve is illustrative, drawn from `netWorthShape(u)`: a rising
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
  sampled points and path data; `share-text.ts` the text runs in the face a script asks for; and
  `share-chart.ts` the composer `shareImage()` calls. Each stays under the one-file line limit, and
  none reads a clock, a file or the network.
- **The checks hold the picture.** Unit tests walk `netWorthShape` for monotonicity, continuity and
  range; the home-card tests hold the question, the host, the live date, the two stroke paths and
  their colours, the knee's position within a pixel of the date's share of the axis, the margin box,
  and XML escaping. The rasterised PNG stays under `SHARE_IMAGE_MAX_BYTES` (about 30 KB).
