# A transaction write refuses a later Balance it makes unreadable

Status: accepted (trajectonomics/trajectonomics#522, part of #190).

`traj balance` refuses the whole ledger with `AMOUNT_OVERFLOW` once any Leaf Account's Balance, on any date, is outside the safe integer range. `account value` was made to refuse such a write (ADR-0072, #499), but `tx add` and `tx import` wrote without asking: `tx add` Equity→Home `90071992547409.91` on 2026-01-05, then `1.00` on 2026-01-06, was accepted, and `traj balance --as-of 2026-01-07` then failed for everyone.

## Decision

**`tx add` and `tx import` refuse a write after which a dated Balance of an account the transaction posts to, on the transaction's date or later, is outside the safe range and worse than the Ledger had it.** It is ADR-0072's rule, in the same code (`store/later-overflow.ts`, which `account value` calls too), not a second copy of it:

- The refusal is `AMOUNT_OVERFLOW`, at the amount of the first posting to the account (`postings.<n>.amount`, which `tx import` reports at the row's `from` or `to` cell). It names the account and the first date on which the write leaves the Balance outside the safe range and worse than the Ledger had it, in the wording `account value` uses: "the Balance of \"Home\" on 2026-01-06", or "a later Balance of ..." when that date is after the transaction's own. Nothing is written, and a dry run refuses the same way.
- Each date is compared with the Ledger's own Balance that day, so a write that shrinks an overflow the Ledger already holds, or cures its first date and shrinks a later one, is accepted (the ledger stays as unreadable as it was; curing it is not this command's), and a write that makes any date's overflow larger, in either direction, is refused. That holds for an asset and a liability alike, because the comparison is of magnitudes.
- A transaction that posts to several accounts is refused once, for the first of them (in posting order) that it leaves in that state.
- A replayed `externalRef` writes nothing and is not asked about. A transaction the core or the store rejects for another reason is refused for that reason first: the check runs after the row is appended and validated, inside the same write, and a refusal rolls the write back.

**`tx import` judges the batch as a whole and lists every row.** The rows are appended in input order, as before, and then one read of the Ledger, taken without them, is the base for the check. Each account's rows are put in date order (rows of one date keep their input order) with a running total, which cuts its dates into stretches the batch holds one total over, so the check does not depend on the order the rows are listed in. A refused row is the one whose write began the overflowing stretch, so a bad row in the middle of a statement is named by its line (`line.<n>.to` or `.from`), and every such row is listed in `details.rows`; the envelope follows ADR-0025 (all or nothing, the highest Exit class names the code, ties by the earliest line).

## Cost

The check reads the Ledger once per write and only when the write added a row (a batch of duplicates reads nothing). The ledger's `balanceHistory` notes the most and least each account's Balance reaches from each Posting on, once, the first time it is asked about the account (`balance-reach.ts`), and answers each stretch from that note; a stretch is scanned for its first overflowing date only when the note says one could overflow. An import of n rows therefore costs one Ledger read, one sort of each account's rows and one constant-time question per stretch, not a scan of the Ledger per row. The one extra cost of `tx add` is that Ledger read, which grows with the ledger; the PR that made this change records the timings.

## Not covered

`tx amend`, `tx void` and `tx reverse` also write transactions and are not checked here: the issue names `tx add` and `tx import`. The net-worth total overflowing is a separate read (#523).
