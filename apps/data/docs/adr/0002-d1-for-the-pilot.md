# ADR 0002: D1 for the pilot

## Status

Accepted, 2026-11-25. Slice 2a of issue #592.

## Context

The pilot writes one batch an hour from one collector host and reads a small daily rollup through a
cached API. The data fits comfortably in SQLite, and Cloudflare D1 gives the Worker a SQL database
with no server to run. The architecture update puts `traj-data` beside the `data` Worker.

## Decision

- The store is D1 `traj-data`, with schema changes committed as numbered files in `migrations/`.
- Tables are `contributor`, `usage_hourly`, `quota_sample`, `rollup_daily` and `ingest_log`.
- Validation and rollup building are pure code in `src/core/`; the D1 layer only reads and writes
  the rows those functions produce. The same SQL runs in D1 and in the in-memory `bun:sqlite`
  tests.
- Ingest upserts hourly rows and rebuilds only the UTC days in the batch, in one `DB.batch`.
- The public read path touches `rollup_daily` only, which keeps the number of rows read per request
  small.

## Consequences

- The free tier is enough for the pilot: one write batch an hour and a cached read API.
- D1 is SQLite, so the database is one writer. Two ingests that touch the same day at the same time
  can race; the pilot has one collector host and one batch an hour, so the window is small. A
  future multi-host fan-out needs a serialization point (a Durable Object or a queue consumer).
- Revisit this decision when the database passes 400 MB, reads pass 1M a day, or product telemetry
  starts. Those are the thresholds in issue #592. Moving then means keeping the SQL plain and the
  core pure, which this layout already does.
