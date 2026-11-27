# ADR 0008: Estimated tiers scale a measured floor by a stated multiplier

## Status

Accepted, 2026-11-27. Follow-up to issue #739 and #744.

## Context

The "What each plan gives" section shows the most tokens a plan carried in any 5 hours, 7 days and
30 days. Those figures come from our own usage on the tier we actually ran (#744), so they are "at
least" figures for that tier and say nothing about a tier we never used.

Vendors do state how their tiers relate: Anthropic's Max gives five times Pro, Cursor's Premium
four times Plus, and so on. The ratio is a property of the vendor's plans, not of our account, and
it is public. A reader who is choosing a tier wants to see the other rows without waiting for us to
run that tier for a month.

## Decision

- A plan's tier picker offers every tier its vendor names. A tier we measured shows its own
  figures unchanged. A tier we did not measure shows an estimate.
- An estimate is the measured floor of one tier scaled by the ratio the vendor states:
  `estimate(picked) = measured(from) × multiplier(picked) / multiplier(from)`. The five-hour window
  uses the five-hour multiplier, and the seven- and thirty-day windows use the weekly multiplier.
  A vendor that states no multiplier for a window, or no multiplier at all, shows "–"; a figure is
  never inferred from a price.
- The estimate is still a lower bound, not a limit. A measured figure is a lower bound on the
  measured tier's limit, and the vendor states `limit(picked) = limit(from) × ratio`, so the
  measured figure times the ratio is a lower bound on the picked tier's limit. Every figure stays an
  "at least" figure.
- A multiplier enters the hand-kept catalogue only with a dated public source: a URL, the UTC day it
  was read and the exact sentence that states it. The catalogue is
  `apps/data/collector/src/tier-catalog.ts`, and the rule sits beside the no-prices rule in
  `apps/data/AGENTS.md`.
- An estimated row is marked visibly, never by colour alone: an accent surface and left edge, `≈`
  in place of `≥`, a striped bar, and a tag naming the source tier and its factor. A screen reader
  hears "estimated, at least N tokens in 5 hours, from Max".
- The explanation lives behind one info control beside the section heading, not on the page.

## Consequences

- A tier we never used gets a figure that is honest about being an estimate, and the page shows
  which measured tier it came from.
- The estimate moves when the measured floor moves, so a quiet week lowers every estimate of that
  plan. That is correct for a lower bound: a quiet week never proves more headroom.
- A vendor that changes a multiplier changes a past figure. The catalogue carries the read date, so
  the change is visible in review and the new figure names its source.
- A plan whose vendor states no multiplier (Mistral, Command Code, Meta, OpenCode free) keeps a
  plain tier label and its measured figures. It gains a picker only when a dated source states a
  ratio.
