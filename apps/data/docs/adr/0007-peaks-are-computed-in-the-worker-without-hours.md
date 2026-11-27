# ADR 0007: Peaks are computed in the Worker and carry no hour

## Status

Accepted, 2026-11-27. Slice 1 of issue #739. It narrows the read path in ADR 0001: the API now
also answers `/data/api/peaks` (and the old host's `/api/peaks`).

## Context

The site asks what each plan gives. Until #599 records quota samples, the only honest answer is
what we already used: the most tokens a plan carried in one 5-hour window, one 7-day window and one
30-day window. That figure is "at least this much", never the plan's limit.

A 5-hour peak cannot come from `rollup_daily`: a day has no hour to place a burst in. It needs the
hourly rows in `usage_hourly`. Reading them in the Worker, summing them per plan and hour, and
answering one aggregate keeps every machine, contributor, model and hour out of the response.

## Decision

- `GET /data/api/peaks` reads `usage_hourly` for the org contributor, whose rows are the
  `measured-by-us` series the rollups are built from. The SQL sums `tokens_total` by plan, bucket
  and granularity, so machines and models are added away before any code sees a row.
- A pure module (`src/core/peaks.ts`) takes those buckets and returns, per plan:
  - `fiveHours`: the largest sum over any 5 consecutive clock hours, from hourly rows only. It is
    null for a plan that reports days only (Mistral).
  - `sevenDays` and `thirtyDays`: the largest sum over any 7 or 30 consecutive UTC days, from
    hourly and daily rows alike.
  - Missing hours and days count as zero, so a window is calendar-consecutive, not consecutive in
    the rows. A tie keeps the earliest window.
- Each figure carries `fromDay`, the UTC day its window started. **No response carries an hour, a
  machine, a contributor or a model**: `fromDay` is a day, and the peak is a sum.
- `asOf=YYYY-MM-DD` caps the read at that day, as it does for `/api/usage` (ADR 0003), and the
  response reports it with `methodVersion: 1`.
- The payload carries the plan's tier at `asOf`, read from the collector's hand-kept, dated tier
  history. A tier that began before our data has an open start; one still active has an open end.
- The response is cached exactly like `/api/usage`: one hour fresh, one day stale-if-error, and one
  cache entry shared by both hosts.

## Consequences

- The public API no longer serves `rollup_daily` alone: this one read answers from `usage_hourly`.
  The guarantee that matters is unchanged and now written into the package rules: an API response
  carries aggregates, and never a machine, a contributor or an hourly bucket.
- A 5-hour peak is a lower bound on what a plan allows, not a measurement of it. A quiet week says
  nothing about headroom, and the site says "at least" beside every figure.
- The read scans every stored bucket, which is small (one org, a few plans, an hour's rows) and
  cached for an hour. If it ever grows past a D1 statement's comfort, a peak table is added with
  the same payload, and this ADR is replaced.
- `methodVersion` bumps if the window rules change (for example, if a window stops counting
  missing hours as zero), because past figures would move.
