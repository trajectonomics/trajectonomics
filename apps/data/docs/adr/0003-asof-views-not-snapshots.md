# ADR 0003: `asOf` views, not frozen snapshots

## Status

Accepted, 2026-11-25. Slice 2a of issue #592. The read path moved to `/data/api/usage`
([ADR 0006](0006-the-data-site-is-served-under-the-sites-host.md)); the old host keeps
`/api/usage`.

## Context

A post cites "as of 2026-11-24" and links to the live site. The numbers behind that date can change:
a late batch can fill a missing hour, a replay can correct a row, and a method change can alter a
rollup. Freezing a copy per cited date would need a snapshot table and a job to fill it, and would
hide corrections from the reader.

## Decision

- `GET /api/usage?asOf=YYYY-MM-DD` answers from `rollup_daily` with `day <= asOf`. It computes the
  view at request time.
- No snapshot or versioned copy of a day is stored. The database keeps the rows and the rollups.
- Every response carries `methodVersion: 1`. A change to the method that computes numbers bumps it.
- A citation names the date and the method version it used; the live page shows both.

## Consequences

- A correction or a late batch changes a historical answer, which is the intent: the site shows the
  best current answer, not a stale copy.
- A reader cannot prove what a page said last week. If that becomes a requirement, a snapshot
  table is added then, and this ADR is replaced.
- The cache key includes `asOf`, so different dates do not share a cached response.
