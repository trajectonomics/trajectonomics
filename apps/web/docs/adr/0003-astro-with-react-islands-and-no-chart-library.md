---
status: accepted
---

# Astro with React islands and no chart library

The Dashboard is built with Astro 7 in static output, with React 19 for the islands that need state (a Scenario picker, a hide-amounts switch). It is the same setup as the Docs Portal, which already builds Astro with `@astrojs/react`. Tailwind 4 reads the `@trajectonomics/brand` tokens, and the theme follows `data-theme`, light or dark.

The Dashboard uses no chart library. Scales, paths and ticks are pure functions in `src/lib/chart/`, tested without a DOM. The React SVG components are thin: they place what those functions return.

## Considered Options

- **A chart library such as Recharts or Chart.js.** Rejected. The Dashboard draws a handful of lines and bars, and a library would bring a second model of scales and a runtime cost for each page.
- **Plain HTML and no islands.** Rejected for the Scenario picker and the switches, which need state the page cannot keep without script.

## Consequences

- The chart functions are tested with plain data, like the rest of `src/lib/`.
- Adding an island means adding a React component under `src/components/`, not a dependency.
