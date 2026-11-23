---
status: accepted
---

# A real asset is one form and one card over parts the CLI already has

A home or a car is often most of what a household owns and the largest cost it carries. A person adds one from what they know (the price, when they buy it, how they pay for it, what it costs to keep, what it earns, when they might sell) and sees its value and its effect on the plan. The engine and the CLI have no asset model of their own: a real asset is composed of an illiquid Account, a purchase, a loan, Flows that read its value and a sale ([cli ADR 0060](../../../cli/docs/adr/0060-a-real-asset-is-composed-of-existing-parts-and-projection-run-accounts-states-each-accounts-value.md)). The page adds one form that writes the parts and one card that reads them back.

## Decision

- **One Edit writes every part.** Saving is one `apply-plan` Edit with `--if-hash` ([cli ADR 0055](../../../cli/docs/adr/0055-a-scenario-write-names-the-content-hash-it-was-read-at.md)), as the loan form's is. Editing reads the items back into the form, and deleting removes every item after a confirmation. A refusal lands on the field whose item and path it names (`asset-refusal.ts`), or at the top of the form.
- **The ids are a convention, and only the Dashboard reads them.** From the Account's id `<id>`: `<id>-purchase`, `<id>-buying-cost`, `<id>-running`, `<id>-rent`, `<id>-sale`, `<id>-selling-cost`, and the loan `<id>-loan` with `-payment`, `-draw` and `-payoff` ([cli ADR 0060](../../../cli/docs/adr/0060-a-real-asset-is-composed-of-existing-parts-and-projection-run-accounts-states-each-accounts-value.md) names the others; the two costs are this page's own). An asset is an Account of kind `asset` with `liquid: false`. An item is part of an asset only when its id and its shape both match what the form writes; one that follows the id but not the shape, such as one edited by hand in the terminal, is listed as an ordinary item, and the card says the asset was changed outside the form. Such a card has no Edit, because a save would overwrite the item by id.
- **No figure is computed.** A running cost or rent as a yearly percent of the value is a Derived amount (`account`, then `scale`), a monthly share `num/120000` of the basis points the person typed, and a selling cost as a percent is `num/10000`. The percent is moved to basis points by string handling, as the loan's rate is. The value line, the paid-off date and this year's costs and rent are read from `balances`, `paidOff` and `cashflow`. The only date arithmetic is the day before the sale, where running costs, rent and payments end, so the sale day is not charged, and the month after a purchase, where a bought asset's running costs and rent start (the engine reads the value before that day's purchase lands, so a cost on the purchase date would be 0.00).
- **No number is chosen for the person.** No field holds a percentage until it is typed, the direction of the value and the rounding of a computed amount have no choice made, and the form says every rate is the person's own estimate. The purchase date, price and loan terms are typed too.
- **Dates are dates.** A purchase and a sale take a date. When the household pins either, the form shows it read-only with its label and a link to the household, as the Flow form does, because an anchor is a household write and not part of this Edit. A Milestone as the sale's date is not offered: a level payment cannot be shifted by a gate, only dropped.
- **Owned already.** The asset is chosen from the assets the Baseline holds, keeps its own id, and is marked `liquid: false`. Its value on the card is the Baseline's own text. Deleting it keeps the Account declared, as an ordinary asset, because a Baseline row whose Account the document does not declare makes every read fail.
- **The items are grouped.** A real asset's items are on its card, and not in Income, Expenses, the plain Account cards, the loan cards or the read-only loans; those pages say where they went and link to the card. The loan is not repeated as a loan card.
- **The card shows what `traj` reports.** Value over time is the `balances` rows (`projection run --accounts`, added to every plan's Projection), drawn with the net worth chart's helpers with the purchase and sale as markers. Whether the asset counts toward accessible net worth is the CLI's answer (`liquid: false` leaves it out), and the card says so. A taxed plan shows a notice on rent and a sale that carry no Tally label. Money the engine reports not funded in the year of the purchase or sale is named, never hidden.
- **What-if.** Each item has a switch, which is a Removal of its Flow, and Try a value sets the fields of the Account and its Flows, as a loan's does. Adding or removing an item is not a Try.

## Considered Options

- **An `asset` kind in the document.** Rejected for the reason [cli ADR 0060](../../../cli/docs/adr/0060-a-real-asset-is-composed-of-existing-parts-and-projection-run-accounts-states-each-accounts-value.md) gives: a second model the engine would not check.
- **Pre-filling a common rate or rounding.** Rejected. A rate is the person's estimate, and a default would read as the product's advice.
- **Computing the end date of running costs in the CLI.** Not available: the CLI states no default and no helper; the day before the sale is plain calendar text.

## Consequences

- The Demo snapshot's `base` plan holds a fictional condo with a loan. `retire-early` is forked before it is added, so the two compare on the salary alone and the snapshot stays under the formatter's 1 MiB file size.
- A rental income Flow in a taxed plan needs a Tally label for the Levy to tax it; the form sets none.
