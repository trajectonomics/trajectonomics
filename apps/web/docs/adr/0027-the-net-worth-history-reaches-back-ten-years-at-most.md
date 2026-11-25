---
status: accepted
---

# The Net worth history reaches back ten years at most

The Net worth page's month-end history held the latest 36 month-ends, so a balance history imported for 2019 ([#403](https://github.com/trajectonomics/trajectonomics/issues/403), the `record-values` Edit of [ADR 0008](0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)) was written to the ledger and never charted ([#495](https://github.com/trajectonomics/trajectonomics/issues/495)). The range already began at the ledger's first transaction date, which an import moves back (it writes Transactions); only the cap stopped it.

## Decision

- **The history is every month-end from the month of the ledger's first transaction to the As-of, at most `HISTORY_MONTHS = 120` of them (ten years)**, the latest ones when the ledger reaches back further. The first transaction date is the one `report networth` states at the As-of (`firstTransactionDate`), which the Plan already read in stage one, so the range needs no read of its own.
- **One `report networth --as-of <month-end>` per month, as before.** The CLI has no batched or series read: `report networth` takes one `--as-of` ([cli ADR 0029](../../../cli/docs/adr/0029-reads-take-their-date-from-the-caller.md)), and every figure still comes from `traj` ([ADR 0002](0002-the-cli-is-the-only-source-of-figures.md)). A batched read would be a CLI change and a new leaf in the Snapshot's allowlist; the cap is what bounds the cost, so it is not needed yet.
- **The cap is the answer to the far date.** A ledger whose first entry is older than ten years (a mistyped year, an import from the 1990s) keeps the latest 120 month-ends. The page says so in plain words under the chart: "The ledger's first entry is in Jan 2010, but the chart shows only the latest 120 month-ends, from Nov 2016. Earlier months are left out." The sentence is shown only when the history starts in a later month than the first entry (`historyCut`, `src/lib/view/net-worth/history.ts`), and it is built from the Snapshot's `params.historyDates` and the first transaction date `traj` stated; the page computes no date.
- **The reread rules are unchanged** ([ADR 0012](0012-the-tax-allowances-page-reads-what-traj-says-each-allowance-could-take.md)). An Edit (`record-values`, `import-values`) reads the whole Plan again after it writes, so the history is planned from the new first transaction date and starts at the new earliest month. A reread that changes only the allowance or chance inputs keeps the held history, and its staleness check compares stage one's net worth read, which carries that first date.

## What it costs

Measured on this machine (the workspace `traj` binary, the fictional ledger of three Leaf Accounts, reads one at a time as the runner does them):

| | per extra year (12 month-ends) | 36 months (before) | 120 months (the cap) |
|---|---|---|---|
| `traj` reads, time | 1.7 s (145 ms a read) | 5.2 s | 17.4 s |
| Snapshot, bytes | 7.3 KB (611 bytes a read, about 100 more per extra account) | 22 KB | 73 KB |

- **The Demo is unchanged.** Its ledger starts in Nov 2024 and its history holds 24 reads (14.7 KB of 763 KB), because the cap bounds the history and does not widen it. A Demo ledger that reached back one more year would grow the file by 7.3 KB (1%) and the build by 1.7 s.
- **A full read of a ledger that fills the cap takes 12 s longer than before**, on top of the 14 to 19 s of a three-plan ledger ([ADR 0012](0012-the-tax-allowances-page-reads-what-traj-says-each-allowance-could-take.md)). Only a ledger that holds that history pays it, and every Edit pays it once.

## Considered Options

- **A range control that rereads (1, 3, 5, 10 years).** Rejected for now: a reread per change costs the same 1.7 s a year, and the page has no other control that changes what the Snapshot holds. The cap gives the first-day chart the issue asks for with no new state.
- **No cap.** Rejected: one mistyped year of 1900 would be 1,500 reads, 4 minutes on every Edit.
- **A cap of five years.** Rejected: it would just move the problem, and the import's own limit is ten years of month-ends (4,000 rows, `RECORD_VALUES_MAX_ROWS`).
- **Thinning older years to quarter-ends.** Rejected: the chart's x positions are the month's index in the history, and a mixed step would need a new rule for them and for the table.

## Consequences

- An import of up to ten years of month-end values is charted from its first month on the first day.
- A ledger older than ten years is charted from its latest ten, with the sentence above. Raising the cap is one constant (`HISTORY_MONTHS`), and this table is the price list.
