import { type AppError, isAppError } from "../errors"
import { parseMinorUnits } from "../store/money"
import { CASHFLOW_TOTALS, type CashflowTotal, type CashflowTotalRow } from "./cashflow-totals-view"
import { refusal } from "./engine"
import { moneyOf } from "./money"

/*
 * The section totals of `projection run --breakdown` (cli ADR-0058, addendum). One function computes
 * them for both the JSON table and the human block, so the two cannot disagree, and the Dashboard
 * never sums money (web ADR-0002). Every total is an exact integer sum, in minor units, of the
 * roll-up's own engine figures or of its engine lines, and nothing else. The sums are BigInt, and a total
 * past the safe integers is refused as `VALUE_OVERFLOW` on the roll-up's last date, as the engine's own are.
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
function minorOf(text: string, currency: string): bigint {
	const minor = parseMinorUnits(text, currency)
	if (typeof minor !== "number") throw new Error(`a cash-flow figure is not money: ${text}`)
	return BigInt(minor)
}

/** The exact integer sum, in minor units, of the lines whose group is one of `groups`. */
function sumOf(lines: readonly LineFigures[], groups: readonly string[], currency: string): bigint {
	return lines
		.filter((line) => groups.includes(line.group))
		.reduce((total, line) => total + minorOf(line.amount, currency), 0n)
}

/** The totals as numbers, or the `VALUE_OVERFLOW` refusal on `date` when one leaves the safe integers. */
function safeTotals(exact: Record<CashflowTotal, bigint>, date: string): CashflowTotals | AppError {
	const totals = {} as CashflowTotals
	for (const total of CASHFLOW_TOTALS) {
		const value = Number(exact[total])
		if (!Number.isSafeInteger(value)) return refusal([{ code: "VALUE_OVERFLOW", date }])
		totals[total] = value
	}
	return totals
}

/**
 * One roll-up's section totals, or the refusal when one is past the safe integers on the roll-up's last
 * date, `to`. Hand-check: a roll-up with income 100.00, withdrawals 30.00 and drawn 15.00 has money in
 * 145.00; with prepaid 60.00 and settlements -18.00 its tax is 42.00.
 */
export function cashflowTotalsOf(
	rollup: RollupFigures,
	lines: readonly LineFigures[],
	currency: string,
	to: string,
): CashflowTotals | AppError {
	const income = minorOf(rollup.income, currency)
	const withdrawals = sumOf(lines, ["withdrawal"], currency)
	const drawn = sumOf(lines, ["drawn"], currency)
	return safeTotals(
		{
			"money in": income + withdrawals + drawn,
			tax: sumOf(lines, ["prepaid", "settlement"], currency),
			withdrawals,
			drawn,
			spending: minorOf(rollup.expense, currency),
			saving: minorOf(rollup.contributions, currency),
			"not funded": minorOf(rollup.unfundedContributions, currency),
			"left over": sumOf(lines, ["surplus"], currency),
			unmet: minorOf(rollup.unmet, currency),
		},
		to,
	)
}

/**
 * The long table of `projection run --breakdown`'s totals: one row per Annual roll-up and section, in
 * `CASHFLOW_TOTALS` order, each amount at the Currency's own scale.
 */
export function cashflowTotalRowsOf(
	annual: readonly (RollupFigures & { index: number; from: string; to: string })[],
	lines: readonly (LineFigures & { index: number })[],
	currency: string,
): CashflowTotalRow[] | AppError {
	const money = moneyOf(currency)
	const rows: CashflowTotalRow[] = []
	for (const rollup of annual) {
		const rollupLines = lines.filter((line) => line.index === rollup.index)
		const totals = cashflowTotalsOf(rollup, rollupLines, currency, rollup.to)
		if (isAppError(totals)) return totals
		for (const total of CASHFLOW_TOTALS) {
			rows.push({
				index: rollup.index,
				from: rollup.from,
				to: rollup.to,
				total,
				amount: money(totals[total]),
			})
		}
	}
	return rows
}
