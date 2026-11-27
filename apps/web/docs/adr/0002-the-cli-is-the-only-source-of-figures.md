---
status: accepted
---

# The CLI is the only source of figures

Every number on the Dashboard is one `traj` returned. The Dashboard never imports a core package to compute a figure, never adds, subtracts or rounds money, and shows the CLI's decimal strings as they are.

A string is parsed to a number in one place only: to place a mark on a chart, where a rounding error cannot reach a figure a person reads. Deltas between two Scenarios come from `traj projection compare`, not from a subtraction in the page.

Money types stay strings in the contract. A Scenario document holds integer minor units and integer rates. The Dashboard reads and writes a Scenario document only in its decimal form (`traj scenario show --decimal`, `traj scenario apply --decimal`), where every money field is a string the CLI converted, and it never computes with one of them.

## Amendment (2026-11-23): the planner pages edit Scenario documents

The planner pages (Income, Expenses, and Assets and debts) list a plan's Flows and Accounts and save one change as one Edit. The page does three things with the decimal document, and no arithmetic:

- **Money is text.** A typed amount has its commas and spaces removed, is checked for shape only, and is sent as the decimal string the person typed. `traj` accepts or refuses it, and a refusal is shown at the field its path names.
- **A change is object editing.** An item is replaced, added or removed by its `id`, and every field the form does not show is kept as it came, so a save that changed nothing leaves the plan `unchanged`.
- **A rate is a percent by moving the decimal point.** A rate stays an integer of basis points in the document. `formatBps` and `parseBps` in `src/lib/format/bps.ts` move the point in the text, refuse more than two places, and never make a float. A rate is not money, so this is not a figure the page computes.

## Amendment (2026-11-27): a multiple is a ratio, truncated to one decimal

The FI reference's multiple is the one figure the page reduces. The CLI states it in integer basis points, and `formatMultiple` in `src/lib/format/multiple.ts` writes it to one decimal by integer arithmetic on that integer, truncating toward zero: 145376 becomes "14.5×", and 249999 stays "24.9×", below the 25× reference it does not meet. Truncation matters: rounding up let a multiple that was not met read as the reference it missed.

This is the first place the page rounds a CLI figure, and the only one allowed until the amendment below, which lets a card shorten a money string. It formats a ratio: no money is added, subtracted or rounded, and the page still shows the CLI's decimal strings as they are.

## Amendment (2026-11-27): a card may shorten a money string, cutting digits and never rounding up

A card is read at a glance, so `formatCompact` in `src/lib/format/compact.ts` shortens a CLI money string by string operations only, keeping the leading digits and dropping the rest, truncated toward zero. "1214900.00" becomes "1.21M", "184000.00" becomes "184k", and "999999.99" becomes "999k", never "1M": a card never states more than the CLI did.

`formatCompact` is used on cards only. The exact string stays in the accessible text, in the hover title, in Details and in every table, form and input. No money is added, subtracted or rounded up.

## Considered Options

- **Compute the deltas and the totals in the page.** Rejected. The point of `traj` is that its arithmetic is the one answer. A second implementation in the page would drift from it without any test noticing.
- **Import `@trajectonomics/core` for the chart's scale.** Rejected for the same reason. The chart only needs numbers that are already printed.

## Consequences

- A figure the CLI does not print is missing from the Dashboard, not estimated.
- A reviewer checks a page by finding the Read it shows, not by re-doing a sum.
