# ADR 0011: Limits are estimated from the usage meter

## Status

Accepted, 2026-11-27. Extended by
[ADR 0014](0014-limits-are-priced-and-counted-with-cache.md). Follow-up to
[ADR 0007](0007-peaks-are-computed-in-the-worker-without-hours.md),
[ADR 0009](0009-peaks-count-cache-reads-apart-and-anchor-claude-sessions.md) and
[ADR 0010](0010-data-starts-when-collecting-starts.md). It adds a figure beside the peaks; it does
not replace them.

## Context

The peaks table answers what each plan carried, never what it allows. A quiet week says nothing
about headroom, and the table says so. Since 2026-11-27 the collector also stores each plan's own
usage meter in `quota_sample`: a whole percent used, the window it covers (`five_hour`, `weekly`,
`monthly`) and the reset time, sampled at about minute 1 of a UTC hour.

A meter reading alone is not a token limit. But two readings and the tokens we used between them
are enough to estimate one: if the meter moved 15 points while we used 2.1M tokens, 100% would be
about 14M. The estimate describes the plan's limit, not our usage, which is what a reader choosing
a plan wants.

## Decision

- A pure `src/core/limits.ts` estimates one window's 100% as
  `tokens used ÷ percentage points moved × 100`, where tokens are the uncached hourly tokens of the
  same measure the peaks use (`tokens_total - COALESCE(cache_read, 0)`).
- Consecutive readings that share a reset period form one segment. `resets_at` is compared to the
  minute, because the API jitters by seconds and milliseconds. A reset (the next reading is at or
  after the previous reset time), a reset time in another minute, or a fall in `used_pct` starts a
  new segment. Segment tokens are the hourly tokens from the first reading's hour up to but not
  including the last reading's hour: a reading in slot H is taken at about H:01, so it reflects use
  up to the end of H−1.
- Segments whose meter did not rise (`Δ% ≤ 0`) contribute nothing. The rest are pooled:
  `tokens = Σ tokens`, `points = Σ Δ%`, `estimate = tokens / points × 100`, returned as whole
  tokens with the number of readings behind it. No reading, hour, reset time or raw percentage
  leaves the Worker: the API serves only the estimate, its range, `points` and `readings`.
- Each reading is rounded to a whole percent, so one segment's movement is uncertain by one point.
  With `n` contributing segments: `low = tokens / (points + n) × 100`, and
  `high = tokens / (points - n) × 100` when `points > n`, else null (no upper bound yet). Fewer than
  three points of movement marks the estimate `rough`, which the page renders in the quiet role
  with "rough estimate" for a screen reader.
- `GET /data/api/peaks` carries `limits: { fiveHours, sevenDays, thirtyDays }` per plan, and on the
  `measured` entry of the tier that is current when the readings were taken. `five_hour` maps to
  `fiveHours`, `weekly` to `sevenDays` and `monthly` to `thirtyDays`. For a plan in
  `MONTH_FROM_WEEK` (Claude and Antigravity, whose vendors state no monthly window) the 30-day
  limit is the weekly limit × 30/7 with `derived: true`.
- `methodVersion` is 3 and `PEAKS_SHAPE` is 4. The page renders a body without `limits` exactly as
  before: its cells keep the measured figure or the collecting state from #786.
- Cache reads are left out of the token measure for now, because the peaks leave them out and the
  meter counts tokens whose kinds we cannot see. Once enough segments exist, a later regression
  across readings can fit a cache-read weight and replace this rule with a measured one.

## Consequences

- A plan with a readable meter shows "≈ 13.8M at 100%" with its range, and a bar of what we used
  against that limit. A rough estimate still shows, quieter, so a new collector sees its first
  honest number after two readings.
- Only Claude and OpenCode Go expose a meter today, so only they gain a limit; every other plan
  keeps its peaks exactly as before. A vendor that starts exposing a meter joins the estimate
  without a schema change.
- The estimate moves with the plan's real limit and with our traffic mix, so it is a range, not a
  reading. It is never presented as an invoice or a vendor statement.
- The read adds one D1 query over `quota_sample`, cached with the peaks body for four hours.
