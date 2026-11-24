---
status: accepted
---

# The Tax page shows the walk, the brackets, the top rate and the share paid in tax

The Tax page listed what each tax year owes and not why. Since `projection run` states each Thai tax year's walk, brackets and rates ([cli ADR 0036](../../../cli/docs/adr/0036-a-result-says-what-each-tax-year-owes.md) as amended, [tax ADR 0008](../../../../packages/core/tax/docs/adr/0008-the-bracket-walk-and-effective-rate-are-pure-functions-over-the-levys-table.md)), the page can say how income became taxable income, which brackets it filled, what one more baht is worth and what share of income went to tax (#405).

## Decision

- **No new read.** Every figure is a field of the `taxYears[]` entries the Snapshot's `projection run` already holds (`walk`, `brackets`, `marginalRateBps`, `toNextBracket`, `effectiveRateBps`, `notes`). The page adds and divides nothing ([ADR 0002](0002-the-cli-is-the-only-source-of-figures.md)): a rate is the CLI's basis points shown as a percent by moving the decimal point as text (`rateWords`), and an amount is its string.
- **The current tax year, first.** It is the year whose period holds the run's As-of, else the first year that starts after it, else none. A section "This tax year" shows the walk as four lines (less expenses, less allowances), the two rates each with a sentence, and the bracket card.
- **The bracket card** has one bar per bracket the income reached, lowest first. The last one is the bracket the last baht of taxable income falls in, marked "Your top rate", and with no income the first is. A bar's width is its bracket's income against the largest reached bracket's, as a percent, for drawing only (`barHeights` and `toChartNumber`, as the other charts do). "X more taxable income before the next rate" shows only when the CLI states `toNextBracket`, so never in the highest bracket. The CLI's notes for the year, such as the minimum tax applying, stand above the bars. When the year has notes and no brackets (the CLI leaves them out when the Levy's progressive tax is not the schedule's sum), the notes are listed on their own. "Lower it with allowances" links to `/optimize/allowances/`; the card exists only for a Levy the CLI walked, so the link is only offered when the plan has one.
- **Every year.** A chart of taxable income stacked by bracket, one series per rate, with each year's top rate as a dashed step line on a second axis on the right, and a table of assessable income, taxable income, tax, top rate and share of income paid. A year the CLI stated no brackets for has no column, and a figure it did not state reads "Not stated".
- **Nominal, said so.** A tax year states no figure in today's money, so the chart is nominal and the page says so; the page has no real/nominal switch because there is nothing real to switch to. When `traj` states real tax figures, the chart takes the Projection page's terms switch.
- **A hand-written Levy** has none of the new fields, and the page is as it was: no section, chart or table, and no error. `hasWalk` in `src/lib/view/tax/current-year.ts` is the one test, and the other parts follow from the fields being absent.
- **The step line is part of `LineChart`.** `withStepLine` (`src/lib/chart/step-line.ts`) adds a series on its own right-hand axis to a column chart's layout, so the hover, the keyboard and the legend work as for any series. It is `plain`: the hide-amounts switch masks money and a rate is not money.

## Considered Options

- **A bar filled to its bracket's width.** Rejected: the width of a bracket is `upTo - from`, which is money arithmetic. The ratio of two stated incomes needs none.
- **A separate small chart for the rate.** Rejected: the rate against the stack is the point, and two charts cannot share a hover.
- **Naming the bracket from `marginalRateBps`.** Rejected: the card marks the last bracket with income in it, which is the walk's own definition of the marginal bracket (tax ADR 0008) and does not fail if the two disagreed.

## Consequences

- Series are named and ordered by rate, so a schedule whose rates differ between years has a series per rate; two brackets with one rate in a year are not expected, and the Thai schedule has none.
- The Demo snapshot is committed without these fields until it is generated at build (#378), so the Demo shows the page as for a hand-written Levy until then.
