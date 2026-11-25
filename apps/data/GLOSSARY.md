# GLOSSARY

The vocabulary of the `data` Worker. The collector's own terms are in
[`collector/README.md`](collector/README.md).

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
