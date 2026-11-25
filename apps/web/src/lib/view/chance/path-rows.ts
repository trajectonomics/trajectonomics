import type { ProjectionPath } from "../../contract"
import { formatMonth } from "../../format"
import { agesText } from "../household/model"
import { type ItemNames, NO_ITEM_NAMES } from "../item-names"
import { type AnnualRow, annualRowsOf } from "../projection/annual"
import { returnText } from "./path-words"

/** The label of the run-out rule on the chart. */
export const RUN_OUT_LABEL = "Ran out"

/** The Account ids the table has a column for, in the order the CLI lists them in the first roll-up. */
export function returnAccounts(path: ProjectionPath): string[] {
	return (path.returns[0]?.accounts ?? []).map((entry) => entry.account)
}

/** One year of the path in the table. */
export interface PathRow {
	readonly key: string
	/** The month the year ends in, "Oct 2052". */
	readonly ends: string
	readonly ages: string
	/** The Account returns of that year, in the order of the table's Account columns; null where `traj` states none. */
	readonly returns: readonly (string | null)[]
	readonly income: string
	readonly spending: string
	readonly netWorth: string
	readonly realNetWorth: string
	/** "Lowest point" and "Ran out" on the years they belong to. */
	readonly marks: readonly string[]
}

/** Whether a year's roll-up holds a date, as the CLI states both. */
function holds(row: AnnualRow, day: string): boolean {
	return day >= row.from && day <= row.to
}

/**
 * The table of years: each annual row with the returns `traj` states for that roll-up (matched by the roll-up's index),
 * its income, spending and net worth as strings, and the marks of the years the lowest point and the run-out fall in.
 */
export function pathRowsOf(
	path: ProjectionPath,
	lowestDay: string | null,
	names: ItemNames = NO_ITEM_NAMES,
): PathRow[] {
	const accounts = returnAccounts(path)
	const returns = new Map(path.returns.map((rollup) => [rollup.index, rollup.accounts]))
	return annualRowsOf(path).map((row) => {
		const states = returns.get(row.index) ?? []
		const marks = [
			...(lowestDay !== null && holds(row, lowestDay) ? ["Lowest point"] : []),
			...(path.runsOut !== null && holds(row, path.runsOut.date) ? [RUN_OUT_LABEL] : []),
		]
		return {
			key: String(row.index),
			ends: formatMonth(row.to),
			ages: agesText(row.ages, names.people),
			returns: accounts.map((id) => {
				const found = states.find((entry) => entry.account === id)
				return found === undefined ? null : returnText(found.returnBps)
			}),
			income: row.income,
			spending: row.expense,
			netWorth: row.closingNetWorth,
			realNetWorth: row.realNetWorth.amount,
			marks,
		}
	})
}
