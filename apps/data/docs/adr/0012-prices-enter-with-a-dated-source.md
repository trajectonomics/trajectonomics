# ADR 0012: Prices enter with a dated source; value is per dollar of subscription

## Status

Accepted, 2026-11-27. Follow-up to [ADR 0008](0008-estimated-tiers-scale-a-measured-floor-by-a-stated-multiplier.md)
and [ADR 0011](0011-limits-are-estimated-from-the-usage-meter.md). It adds the price catalogue and
the site's two per-dollar views.

## Context

A reader choosing a plan asks two things: how many tokens they get, and what a dollar of the
subscription buys. The peaks answer the first in tokens, but a larger plan naturally carries more
tokens; a figure that ignores the price ranks plans by size, not by value.

Prices are public and dated. The site already keeps a tier history and a multiplier catalogue with
a dated source for every stated ratio. A price belongs in the same kind of hand-kept table, not in
the plan table and never inferred from a neighbouring tier.

Two different questions need two different answers. Tokens per dollar measures what we used against
what we paid. API value per dollar asks what the same usage would have cost at the vendor's list
prices, so a plan that bundles expensive models can be compared with one that bundles cheap ones.

## Decision

- `collector/src/price-catalog.ts` holds two hand-kept tables, beside the tier catalogue.
  `PLAN_PRICES` maps a plan and tier to a monthly USD price, with `{ url, read, quote }` for every
  positive price. A price the vendor does not state is `null`; a missing price is never inferred.
  `MODEL_PRICES` maps a model id to list prices per million tokens for input, output, cache read and
  cache write. A provider prefix is dropped from the usage row's model id before the lookup, and a
  model absent from the table has no price.
- A weekly price is `monthly USD × 12 / 52`. A plan with a zero monthly price is free.
- Tokens per $1 is the plan's weekly figure ÷ the weekly price.
- The blended API price per token is the plan's own usage over the window priced at each model's
  list prices, divided by those rows' tokens without cache reads. Rows for models with no price
  stay out of both sides. A cache-write price of `null` means the vendor states none, and the write
  is priced at the input price.
- API value per $1 is `weekly tokens × blended API $ per token ÷ weekly price`.
- Cache rate is cache read ÷ all tokens, the measure the site already shows beside a peak and a
  meter. A source that reports no cache split has no rate.
- A free plan is left out of every per-dollar chart because there is no price to divide by, and the
  notes say so. A plan whose models all lack a price gets no dot; the notes say which rows are left
  out. A plan without an estimate keeps its "most we used" figure and draws a hollow or hatched
  mark, so a lower bound is never read as a limit.
- The site's charts sort best first, label their axes, and shade the best-value area: above the
  median on both axes, or the upper-right third when fewer than three dots leave no median worth
  drawing. A span wider than ten times draws on a log scale.

## Consequences

- A price change moves past per-dollar figures, and the catalogue's read date makes the change
  visible in review. The site never presents a price as an invoice or a vendor statement.
- A new model with no price leaves the blend silently, so the notes say that rows missing a price
  are left out and the method page lists every price and its source.
- DeepSeek's figures are off-peak prices; peak prices are double. The catalogue notes it, and the
  per-dollar view inherits that caveat rather than inventing a blended peak rate.
- A vendor that changes a tier's name changes a catalogue entry, with a new dated source. The tier
  history and the price catalogue stay separate, so a multiplier is never inferred from a price.
- The site needs no new endpoint: prices are build-time constants, and the usage and peaks reads
  supply every figure they are divided into.
