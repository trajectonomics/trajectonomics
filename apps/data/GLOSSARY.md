# GLOSSARY

The vocabulary of the `data` Worker. The collector's own terms are in
[`collector/README.md`](collector/README.md).

## Base Path

The data site's address under the one host: `/data`. The assets binding serves the build's root
there, and the API and ingest sit under it (`/data/api/...`, `/data/ingest`).

## Old Host

The data site's former hostname, still a Custom Domain on the `data` Worker. It answers `/api/*` and
`/ingest` for the collector, and every other GET or HEAD redirects to the same path under the apex's
base path (ADR 0006).

## Contributor

The owner of a set of usage rows. The pilot has one, `trajectonomics`, an `org`; `community`
contributors arrive later. A contributor may carry an auth user id and an opt-in handle, but never
an email or a name in `traj-data`.

## Usage Row

One machine's usage for one plan, model and UTC hour (or UTC day for the Mistral console export):
tokens in, out, cache read, cache write, total, requests, source and a best-effort flag. Its
identity is machine, plan, model, bucket and source, so replaying it is an upsert.

## Quota Sample

One observation of a plan window's meter: the percentage used and the reset time, at a UTC hour.
Claude and OpenCode Go are the plans with a readable meter.

## Window

The period a quota percentage covers: `five_hour`, `weekly`, or `monthly`.

## Anchored Window

A 5-hour window that starts at the first UTC hour with activity, instead of sliding over the clock.
Claude's session starts with its first message, so only `claude` uses anchored windows; the next
window starts at the first activity at least five hours after the previous start.

## Cache Read

Tokens a provider serves from its prompt cache, stored in `cache_read`. They cost far less than
input, output or cache writes, so the peaks count them apart and leave them out of the headline
figure.

## Derived Month

The 30-day figure for a plan whose vendor states no monthly window: `floor(week × 30/7)`. Claude
and Antigravity have one; every other plan shows its measured 30-day peak.

## Rollup

One UTC day's totals for one plan and model, summed from that day's Usage Rows and stored in
`rollup_daily`. The public API serves rollups only, never hourly rows.

## Series

The provenance of a set of rollups. The org's series is `measured-by-us`; a community series is a
separate series, never mixed into ours.

## asOf

A `YYYY-MM-DD` cap on a read: the answer uses data up to and including that day. It is a
query-time view, not a frozen snapshot (ADR 0003).

## Plan Table

The collector's hand-kept list of plans (`collector/src/plans.ts`): stable plan ids, display names,
active dates and matching rules. No prices in this slice. The Worker accepts a plan id only when it
exists in that table.
