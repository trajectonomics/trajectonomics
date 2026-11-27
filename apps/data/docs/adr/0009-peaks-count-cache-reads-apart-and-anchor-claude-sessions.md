# ADR 0009: Peaks count cache reads apart, anchor Claude's sessions and derive a month from a week

## Status

Accepted, 2026-11-27. Follow-up to ADR 0007 and ADR 0008. It replaces the figure rules in 0007
and the estimate's month rule in 0008.

## Context

The "What each plan gives" section summed every token kind. In Claude's busiest five hours, cache
reads were 889M of the 901M tokens; input and output together were 3.6M. A figure led by cache
reads describes how well the prompt cache worked, not how much work the plan carried.

A 5-hour window aligned to the clock can straddle Claude's reset. Claude's session starts with the
first message, so the honest window starts there too.

Claude and Antigravity state no monthly window. A measured 30-day figure answers a question their
vendors never ask, and it moves for reasons unrelated to the plan.

"≥" read badly beside a figure and suggested a precision the measurement does not have. People
also asked to open a plan and see its models.

## Decision

- `readPeaks` sums `tokens_total - COALESCE(cache_read, 0)` as the token figure and
  `COALESCE(cache_read, 0)` as the cache reads. Each `Peak` carries `cacheRead`, the cache-read sum
  over the same window that won the token figure, never the window that maximises cache reads.
  The site shows a cache-read share as a small figure beside the meter and under a peak, and leaves
  it out of every bar.
- A pure `anchoredWindows` builds windows greedily: one starts at the first hour with data, covers
  `[start, start + width)`, and the next starts at the first hour with data at or after its end.
  `FIVE_HOUR_ANCHOR` names `claude`; every other plan keeps the sliding `bestWindow`. The 7- and
  30-day windows keep `bestWindow`. Tier peaks use the same rule for their own rows.
- `MONTH_FROM_WEEK` names `claude` and `antigravity`: their 30-day figure is
  `floor(sevenDays × 30 / 7)`, marked derived, with the same rule for cache reads. A tier estimate
  scales that derived figure. Every other plan keeps its measured month.
- No "≥" remains in the app. A measured figure is labelled "Most we used"; an estimate keeps "≈"
  and the "Estimated from <tier> ×N" note. A measured floor and an estimate still take the larger
  of the two, worded as such.
- The body's `methodVersion` is 2 and `PEAKS_SHAPE` is 3. The page renders a shape-2 body without
  a cache line rather than breaking.
- A plan's summary row gains a disclosure listing its models for the same window, one meter each,
  from the usage rows the overview already holds.

## Consequences

- The headline figures are smaller and match the tokens that cost the most.
- A shape-2 body cached before this deploy still renders; only its cache lines are absent.
- A vendor that starts stating a monthly window leaves `MONTH_FROM_WEEK` with a dated source for
  the change, as a multiplier does.
- The model disclosure adds no request: it reads the usage payload the page already loaded.
