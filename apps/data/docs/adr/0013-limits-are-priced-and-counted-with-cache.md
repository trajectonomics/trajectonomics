# ADR 0013: Limits are priced and counted with cache

## Status

Accepted, 2026-11-28. Follow-up to
[ADR 0011](0011-limits-are-estimated-from-the-usage-meter.md). It adds two measures to the same
estimate and tightens when the estimate is called rough; it does not replace the estimate.

## Context

ADR 0011 divides the *uncached* tokens used between two meter readings by the points the meter
moved. That measure leaves cache reads out, because the peaks leave them out, but the plan's own
meter does charge for them, just at a lower price. It also treats an Opus token and a Sonnet token
alike, so a week on a cheaper model estimates the same 100% as a week on the expensive one.

An estimate built from a couple of readings a few hours apart was also published as if it were
solid. A one-afternoon estimate says more about that afternoon than about the plan's limit.

## Decision

- The meter read `readMeterHours` returns one org hourly row per plan, hour and model with
  `tokens_in`, `tokens_out`, `cache_read`, `cache_write` and the raw stored `tokens_total`, which
  includes cache reads. A pure `core/meter-hours.ts` sums them per plan and hour into three
  measures: `uncached = max(0, tokens_total − cache_read)`, `processed = tokens_total`, and `usd`
  from the collector's `tokenCost` at `modelPriceOn(model)`. An hour holding a model with no list
  price has a null `usd` for the whole hour: pricing only part of an hour would price a model mix
  we never ran.
- `core/limits.ts` chooses segments exactly as ADR 0011 does, and pools the three measures over
  the same contributing segments and half-open hour ranges. The uncached tokens decide whether a
  segment contributes and keep the existing `tokens/low/high`. `processed` and `usd` follow the
  same `sum ÷ points × 100` rule with one extra point per segment at the low end and one fewer at
  the high end. Processed tokens round to whole tokens, dollars to cents. The pooled `usd` is null
  when any hour of a contributing segment has a null `usd`; an hour with no rows counts as zero,
  not as unknown.
- `rough` is now `points < 3 || spanMs < 24h`, where the span runs from the earliest contributing
  segment's first reading to the latest contributing segment's last reading. The rule applies to
  every window, including a month derived from a week.
- `monthFromWeek` scales all three measures by 30/7, flooring token figures and rounding dollars
  to cents, and keeps `rough`.
- The API still serves aggregates only: no reading, hour, reset time or raw percentage leaves the
  Worker. `methodVersion` is 4 and `PEAKS_SHAPE` is 5.

## Consequences

- A plan with a readable meter shows the same estimate in three units: tokens as the peaks count
  them, tokens with cache reads in full, and the API list dollars those tokens would cost. The page
  switches units on the limits bars; a body cached before shape 5 shows only the token unit.
- Cache reads now move the `With cache` and `API $` estimates, at the weight the vendor charges for
  them, without changing the token estimate the peaks use.
- A plan with a model outside the price catalogue has no dollar estimate for a window that used it,
  which is honest: the mix cannot be priced from the catalogue we keep.
- A new collector's estimate says “rough” until it has three points of meter over at least a day,
  even when it already has three readings.
- The peaks read adds one more D1 query over `usage_hourly`, alongside the peaks and quota reads,
  cached with the peaks body for four hours.
