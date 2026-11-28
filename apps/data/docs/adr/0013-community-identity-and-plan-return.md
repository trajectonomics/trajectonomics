# ADR 0013: Community identity has three modes, and plan return is measured against the plan's price

## Status

Proposed, 2026-11-28. Extends ADR 0004 (the auth service) and ADR 0009 (cache reads kept apart).

Amended by [ADR 0016](0016-the-log-serves-hourly-sums-for-short-windows.md), 2026-11-28: the public API also serves the org's hourly sums per plan for at most 7 days, for the Log's hour view.

## Context

`trajectonomics.com/data` is a pilot with one contributor, the trajectonomics organisation, on a
series marked measured-by-us. Ingest is stats-only: plan, model, UTC bucket and numbers, never a
prompt, a session title, a path, an account id or a time of day. Its public API serves aggregates
from `rollup_daily` and peaks only, never a stored row, a machine, a contributor or an hourly
bucket.

People who contribute their own usage want to see where they stand, and a few want to be seen. A
leaderboard is the obvious shape for that, but it costs privacy, it invites gaming, and it measures
burn rather than value: a person who leaves a model idle on a large plan can top a table without
getting more work done. Existing trackers split into aggregate-only and leaderboard shapes;
external benchmarks publish price lists and editorial rankings, which are opinions, not measured
subscription usage. None publish quota consumed per plan beside tokens.

The community series must stay separate from the measured-by-us series, and a per-person view must
never leak into the aggregate reads.

## Decision

### Fully anonymous

No account. `traj-data` never stores an email, a name or a handle. The collector dedupes by a
machine label only, `m-` plus eight hex characters of the hostname's SHA; the label is a join key,
not an identity. Ingest carries aggregates only, and no profile is ever served.

### Logged-in hidden

The auth user id sits on the contributor row only, never an email or a name, and is never shown
publicly. Storage and aggregates match the anonymous mode. A private view of one's own rows may
come later; revoking consent stops future ingests.

### Logged-in shown

Same storage as hidden. An opt-in public handle may be displayed, and this is the only mode
eligible for any per-person view (a profile or a leaderboard). It is off by default; revocation
hides the handle immediately. Per-person reads live on a separate opt-in endpoint, are not part of
the community series, and never enter rollups or peaks.

### Rules that apply to every mode

- **k-anonymity.** A public aggregate slice with fewer than three contributing machines is
  suppressed, not shown with a small count.
- **Dry run.** `collector send --dry-run` prints the exact payload and opens no connection.
- **Plan return.** The API-equivalent value of plan-covered usage divided by the plan's price over
  the same 30-day window. Bands: 1x is paid off, 3x is power, 10x is max. Cache reads are excluded
  from the headline, as in ADR 0009. A price enters only with a dated public source and is never
  inferred.
- **Open data.** Community aggregates are published under CC BY 4.0 as JSON and CSV; reads need no
  authentication.
- **Separate series.** The community series is written to its own tables and rollups and is never
  mixed with the measured-by-us series.

## Consequences

- The community launches with no public profile: anonymous and hidden contributors only add rows.
- A slice under three machines stays invisible until enough people contribute, which slows the
  first leaderboard but keeps a single person from being identified.
- The plan-return figure depends on dated prices, so a vendor price change is a data change with a
  source, not an inference.
- Terms to add to the glossary when the schema lands: Anonymous contributor, Hidden contributor,
  Public contributor, Plan return, Community series.
- The community writes to its own tables and rollups; a bug there cannot alter the measured-by-us
  series.
- Rejected alternatives:
  - **Leaderboard first.** Traction is unproven and the privacy cost is paid before anyone gains.
  - **Aggregates only forever.** Contributors want proof of their own practice, not only a group
    total.
  - **Price leaderboards.** They measure spend and burn, not the value a plan returns.
