import type { AppError } from "../errors"
import { type CashflowTotals, type LineFigures, safeTotals, sumOf } from "./cashflow-totals"

/*
 * The nine section totals of one Reporting year or Reporting month (cli ADR-0086). A Reporting span
 * has no roll-up row, so every total is the exact integer sum of the span's own engine lines, in minor
 * units, and nothing is copied from a roll-up field. The sums share `sumOf` and the overflow refusal
 * (`safeTotals`) with the Annual roll-up's totals, so the two cannot disagree about what a section is.
 */

/**
 * One span's totals, or the `VALUE_OVERFLOW` refusal on the span's last date, `to`. Hand-check: a
 * span with income 100.00, a payout 10.00, a withdrawal 30.00 and drawn 15.00 has money in 155.00;
 * with prepaid 60.00 and settlements -18.00 its tax is 42.00.
 */
export function spanTotalsOf(
	lines: readonly LineFigures[],
	currency: string,
	to: string,
): CashflowTotals | AppError {
	return safeTotals(
		{
			"money in": sumOf(lines, ["income", "payout", "withdrawal", "drawn"], currency),
			tax: sumOf(lines, ["prepaid", "settlement"], currency),
			withdrawals: sumOf(lines, ["withdrawal"], currency),
			drawn: sumOf(lines, ["drawn"], currency),
			spending: sumOf(lines, ["expense"], currency),
			saving: sumOf(lines, ["contribution"], currency),
			"not funded": sumOf(lines, ["unfunded"], currency),
			"left over": sumOf(lines, ["surplus"], currency),
			unmet: sumOf(lines, ["unmet"], currency),
		},
		to,
	)
}
