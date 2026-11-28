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

## Tombstone

One row in `contributor_tombstone`: the SHA-256 hex of a deleted auth user id, never the id itself.
It answers "was this account deleted?", so an access token issued before the deletion cannot send
again, and it stays behind after the contributor's rows are gone (ADR 0015).

## Org binding

The auth user id in `contributor.auth_user_id` on the `trajectonomics` row. The first verified
ingest whose `sub` equals `ORG_AUTH_USER_ID` while the row is unbound sets it, inside the ingest's
own batch. After that the binding alone decides; the secret stops mattering, and deleting that
account unbinds the row instead of deleting the org's series (ADR 0015).

## Web Session

A signed-in browser on the data site. `web_session` stores the SHA-256 hex of a random session id,
never the id itself, with the auth user id and an 8-hour expiry. The id lives only in an HttpOnly,
Secure, SameSite=Lax cookie on `/data`; signing out deletes the row, and deleting the account
removes that user's sessions in the same batch as the tombstone (ADR 0015).

## Usage Row

One machine's usage for one plan, model and UTC hour (or UTC day for the Mistral console export):
tokens in, out, cache read, cache write, total, requests, source and a best-effort flag. Its
identity is machine, plan, model, bucket and source, so replaying it is an upsert.

## Quota Sample

One observation of a plan window's meter: the percentage used and the reset time, at a UTC hour.
Claude and OpenCode Go are the plans with a readable meter.

## Limit estimate

The tokens a plan window would hold at 100%, estimated from its own usage meter: the tokens we used
between two readings ÷ the percentage points the meter moved × 100. It comes in three measures:
uncached tokens, processed tokens (cache reads counted in full) and API list dollars (every token
kind at its model's list price). Readings that share a reset period form one segment; a reset, a
change of reset time or a fall in the meter starts a new one. Whole-percent rounding widens the
range by one point per segment. An estimate is rough until it has three points of meter over at
least 24 hours. Only the estimates, their ranges and their evidence are published, never a reading
or its time (ADR 0011, ADR 0014).

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

## Processed tokens

All tokens a plan processed, cache reads included: the stored `tokens_total`. The peaks and the
Limit estimate's token measure leave cache reads out; its `With cache` measure counts them in full.

## Derived Month

The 30-day figure for a plan whose vendor states no monthly window: `floor(week × 30/7)`. Claude
and Antigravity have one; every other plan shows its measured 30-day peak.

## Rollup

One UTC day's totals for one plan and model, summed from that day's Usage Rows and stored in
`rollup_daily`. The public API serves rollups only, never hourly rows.

## Series

The provenance of a set of rollups. The org's series is `measured-by-us`; a community series is a
separate series, never mixed into ours.

## Collecting since

The first UTC day the `measured-by-us` series holds a rollup for, and per plan the first day that
plan holds one. `/api/health` serves them as `collectingSince` and `planSince`, as days only. A
peaks window longer than the collected span shows its days so far instead of a figure
(ADR 0010).

## asOf

A `YYYY-MM-DD` cap on a read: the answer uses data up to and including that day. It is a
query-time view, not a frozen snapshot (ADR 0003).

## Plan Table

The collector's hand-kept list of plans (`collector/src/plans.ts`): stable plan ids, display names,
active dates and matching rules. Prices do not live here; they live in the dated price catalogue
(`collector/src/price-catalog.ts`). The Worker accepts a plan id only when it exists in that table.

## Tokens per $1

A plan's weekly token figure divided by its weekly subscription price. The weekly price is the
vendor's monthly USD price × 12 / 52. A free plan has no price to divide by and no figure.

## API value per $1

The week's tokens times the plan's blended API list price per token, divided by the weekly price.
The blend prices the plan's own usage over the window at each model's list price and divides by the
tokens without cache reads. Rows for models with no list price are left out.

## Cache rate

Cache reads as a share of all tokens: `cache read ÷ (tokens + cache read)`, the same measure shown
beside a peak. A source that reports no cache split has no cache rate.
