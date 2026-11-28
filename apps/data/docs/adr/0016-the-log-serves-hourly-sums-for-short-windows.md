# ADR 0016: The Log serves hourly sums for short windows

## Status

Accepted, 2026-11-28. It amends ADR 0007: the API now also answers
`GET /data/api/usage/hourly` (and the old host's `/api/usage/hourly`).

## Context

The Log showed the raw token totals per plan and model over a 30-day window, bucketed by UTC day.
On 2026-11-28 the owner asked for an hourly view of the Log: a period picker (1D, 3D, 1W, this week,
this month, 1M, 3M) and a bucket picker (by hour, day or week).

A day cannot show which hours the usage fell in. `rollup_daily` holds no hour, and the atomic rows
in `usage_hourly` carry a machine, a model and a contributor, none of which may leave the Worker.
The peaks read already sums those rows per plan and bucket (ADR 0007), but it answers a peak, not a
series.

## Decision

- `GET /data/api/usage/hourly` serves the org contributor's `usage_hourly` rows summed per plan and
  UTC hour, for at most seven days per request. `to` is inclusive, `asOf` caps it the same way the
  usage read does, and a request with no days names today.
- Only `granularity = 'hour'` rows are read. A day-only plan, such as Mistral's console export, has
  no hourly line; the Log says so rather than plotting its day at hour zero.
- The response is `{ asOf, methodVersion: 1, series: "measured-by-us", from, to, rows }`, one row
  per plan and hour with `tokensTotal` and `requests`. `tokensTotal` keeps the rollup's meaning,
  cache reads included, so an hour sums to the daily chart's figure. **No response carries a
  machine, a contributor or a model.**
- The read is cached exactly like `/api/usage`: one hour fresh, one day stale-if-error, and one
  cache entry shared by both hosts.
- The seven-day cap keeps a response small and matches the only periods that offer an hour bucket:
  1D, 3D, 1W and this week all fit in a week.

## Consequences

- The public site now shows which UTC hours the org's usage falls in. The owner accepted that on
  2026-11-28; it names no person, machine or model.
- The per-model split stays daily. An hour's tokens are a plan's sum over its models and machines,
  which is what a rate chart answers; the table under it still splits the period by model.
- A day-only plan has no hourly line, and the Hour view names it in one sentence. Its days still
  appear in the daily and weekly buckets.
- The read scans a week of stored buckets, which is small and cached for an hour. A longer window
  is rejected with `INVALID_RANGE` instead of growing the scan.
