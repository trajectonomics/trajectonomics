# ADR 0005: Rebuild rollups inside the ingest batch

## Status

Accepted, 2026-11-26. Follow-up to issue #592.

## Context

The first ingest read each affected day, merged the stored and incoming rows in TypeScript, then
wrote an upsert batch. That read was stale under concurrency: two ingests for one day each rebuilt
the day's rollup from the state before either write, so the second overwrote the first's totals. It
also cost one D1 query per affected day on top of the batch, and a 60-day backfill would pass the
50-query limit of Workers Free.

Cloudflare counts `db.batch()` as one query against the per-invocation limit, but every statement in
the batch keeps the per-statement limits (100 bound parameters, 100 KB SQL), and the whole batch
must finish within 30 seconds. We are on Workers Free.

## Decision

- One `DB.batch` per ingest: the usage and quota upserts, then for each affected day a `DELETE` and
  an `INSERT ... SELECT` that sums the stored hourly rows grouped by plan and model.
- The rollup SQL keeps `SUM`'s all-NULL result as NULL, and uses `MAX(granularity = 'day')` and
  `MAX(best_effort)` for the flags.
- The pre-read, `mergeUsage`, `usageKey` and the TypeScript `buildRollups` are removed.
- The public read path still serves `rollup_daily` only.

## Consequences

- An ingest is one D1 query whatever the number of days it spans, so a long backfill cannot pass the
  Free query budget.
- Two ingests that touch the same day each rebuild from the rows stored when their batch runs, so
  distinct rows add up instead of overwriting. The last write still wins for the same row key.
- Rollup logic lives in SQL and is tested against the in-memory SQLite database.
