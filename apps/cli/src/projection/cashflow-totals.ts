import { parseMinorUnits } from "../store/money"
import { CASHFLOW_TOTALS, type CashflowTotal, type CashflowTotalRow } from "./cashflow-totals-view"
import { moneyOf } from "./money"

/*
 * The section totals of `projection run --breakdown` (cli ADR-0058, addendum). One function computes
 * them for both the JSON table and the human block, so the two cannot disagree, and the Dashboard
 * never sums money (web ADR-0002). Every total is an exact integer sum, in minor units, of the
 * roll-up's own engine figures or of its engine lines, and nothing else.
 */

/** The annual roll-up's figures the totals read, as the annual table states them (decimal strings). */
export type RollupFigures = {
	income: string
	expense: string
	contributions: string
	unfundedContributions: string
	unmet: string
}

/** One engine line of a roll-up, by its group and amount (decimal string). */
export type LineFigures = { group: string; amount: string }

/** One roll-up's totals, in minor units. */
export type CashflowTotals = Record<CashflowTotal, number>

/** A decimal string as its minor units; the engine states every figure at the Currency's scale. */
function minorOf(text: string, currency: string): number {
	const minor = parseMinorUnits(text, currency)
	if (typeof minor !== "number") throw new Error(`a cash-flow figure is not money: ${text}`)
	return minor
}

/** The exact integer sum, in minor units, of the lines whose group is one of `groups`. */
function sumOf(lines: readonly LineFigures[], groups: readonly string[], currency: string): number {
	return lines
		.filter((line) => groups.includes(line.group))
		.reduce((total, line) => total + minorOf(line.amount, currency), 0)
}

/**
 * One roll-up's section totals. Hand-check: a roll-up with income 100.00, withdrawals 30.00 and drawn
 * 15.00 has money in 145.00; with prepaid 60.00 and settlements -18.00 its tax is 42.00.
 */
export function cashflowTotalsOf(
	rollup: RollupFigures,
	lines: readonly LineFigures[],
	currency: string,
): CashflowTotals {
	const income = minorOf(rollup.income, currency)
	const withdrawals = sumOf(lines, ["withdrawal"], currency)
	const drawn = sumOf(lines, ["drawn"], currency)
	return {
		"money in": income + withdrawals + drawn,
		tax: sumOf(lines, ["prepaid", "settlement"], currency),
		withdrawals,
		drawn,
		spending: minorOf(rollup.expense, currency),
		saving: minorOf(rollup.contributions, currency),
		"not funded": minorOf(rollup.unfundedContributions, currency),
		"left over": sumOf(lines, ["surplus"], currency),
		unmet: minorOf(rollup.unmet, currency),
	}
}

/**
 * The long table of `projection run --breakdown`'s totals: one row per Annual roll-up and section, in
 * `CASHFLOW_TOTALS` order, each amount at the Currency's own scale.
 */
export function cashflowTotalRowsOf(
	annual: readonly (RollupFigures & { index: number; from: string; to: string })[],
	lines: readonly (LineFigures & { index: number })[],
	currency: string,
): CashflowTotalRow[] {
	const money = moneyOf(currency)
	return annual.flatMap((rollup) => {
		const rollupLines = lines.filter((line) => line.index === rollup.index)
		const totals = cashflowTotalsOf(rollup, rollupLines, currency)
		return CASHFLOW_TOTALS.map((total) => ({
			index: rollup.index,
			from: rollup.from,
			to: rollup.to,
			total,
			amount: money(totals[total]),
		}))
	})
}
