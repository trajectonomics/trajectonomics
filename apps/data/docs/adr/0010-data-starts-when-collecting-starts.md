# ADR 0010: Data starts when collecting starts

## Status

Accepted, 2026-11-27. Follow-up to ADR 0007 and ADR 0009. It amends the history ADR 0005 assumed
and the window completeness ADR 0007 left open.

## Context

Until 2026-11-27 the site held usage backfilled from local logs, including days before the hourly
collector ever ran. The backfill mixed sources with different granularities, so a day's total
depended on which machine happened to be copied and which console export was imported. The figures
answered a question about the logs, not about the plan, and the mix confused the numbers.

On 2026-11-27 the owner removed every backfilled row. The site now holds only the usage the hourly
collector measured live, from 2026-11-27 11:00 UTC. A person starting their own collector sees the
same state on day one: a few hours, not a month. The page read that state as a full month and
showed a daily rate, a 30-day peak and 29 leading zero days as if they were measured.

## Decision

- `GET /data/api/health` also answers `collectingSince`, the earliest UTC day in `rollup_daily` for
  `measured-by-us`, and `planSince`, the earliest day per plan. Both are day aggregates: no hour, no
  machine and no contributor leaves the Worker, as ADR 0007 requires of peaks.
- A peaks window shows its figure only once the plan has been collected for the window's full
  length. Until then the cell shows a progress bar and "n of N days". The 5-hour column always keeps
  its figure, because a 5-hour window fits in the first day.
- Claude's and Antigravity's derived month is the week × 30/7, so it waits for a full week rather
  than 30 days; the cell says "week × 30/7 after 7 days" until then. An estimate scaled from an
  incomplete window waits the same way.
- The freshness line says "Collecting since 27 Nov · day N" when the first day is known. The
  summary's total says "since 27 Nov" instead of "· 30 days", and on day one a plan shows its total
  "so far today" instead of a daily rate, because a partial day is not a rate.
- The chart starts at the first collected day, so it never leads with zeros from before collection.
  The table and breakdown name the same first day.
- The collector's first run on a host with no cursor starts at the start of the current UTC hour.
  It sends no history. A host's later runs re-read six hours before the cursor, as before.
- The page tolerates a health body cached before this deploy: without the two fields it behaves
  exactly as it did before.

## Consequences

- A new collector sees an honest first day: a total so far, a 5-hour figure and the windows still
  filling, instead of a month it never measured.
- The site says less than before after a reset, and says it plainly. Every figure it still shows is
  one it collected live.
- `readCollectingDays` adds one D1 query to the health read. Health is cached for 60 seconds, so the
  cost stays bounded; the cron tick keeps using the report's staleness alone.
- A window's figure appears on the day the span completes, not before. A plan first seen later than
  the org starts its own count, because the window is the plan's, not the site's.
- A backup of the removed rows is kept privately, outside this repository, so the history can be
  revisited without keeping it in the public site's database.
