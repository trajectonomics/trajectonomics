# Visualize

Replace words that explain something with a picture that shows it, and write the one figure that matters on the picture.

## Pick the picture

| The words explain | Draw |
|---|---|
| a figure over time | a line, with the answer written at the point that matters and the start of any change marked |
| one share of a whole | a ring or a bar filled to the share, with the share written on it |
| a few items compared | sorted bars with direct labels; small multiples once there are many series |
| a state: ok, warning, done | an icon and a colour token in a fixed position, or a dot on the navigation entry |
| progress toward a goal | a bar or a ring to the goal, with what remains written on it |
| where money flows | a flow diagram, as on Cash flow, or numbered steps |
| two plans side by side | the same chart for each, on the same scale, with the difference written on it |
| a date or a milestone | a marker on the timeline, with the date on it |

## Draw it

- **One dominant mark.** The answer's mark gets the accent colour and the weight, and everything else is neutral support. A busy chart is louder, not clearer.
- **Readable on its own.** Hide every word on the chart except the number written on it. The person can still tell the shape of the answer: rising, falling, enough, not enough.
- **Hand-drawn SVG in Svelte**, coloured by the brand's `--ds-*` tokens. In the Dashboard, a mark is placed through `toChartNumber`, and its label is the CLI's string (web ADR 0002). Use the `tufte` skill for the chart type and its kill list, within the limits that `DESIGN_PRINCIPLES.md` sets.
- **A text equivalent:** `role="img"` with an `aria-label` that states the answer, or a screen-reader sentence. A label that does not fit on a phone is stated in text below the chart (the browser check `marker-labels.e2e.ts` measures this).

## Done when

Every block of explaining words from the inventory is either replaced by a picture or tagged with its "When words win" case from `DESIGN_PRINCIPLES.md`. Every new picture passes the readable-on-its-own test and has a text equivalent.
