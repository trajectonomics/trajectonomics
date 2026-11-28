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

/**
 * Whether the CLI stated each roll-up's own inflation, so the table has an Inflation column (cli ADR-0085):
 * a path read without an inflation factor states none, and the table stays as it was.
 */
export function pathInflationShown(path: ProjectionPath): boolean {
	return path.returns.some((rollup) => rollup.inflationBps !== undefined)
}

/** One year of the path in the table. */
export interface PathRow {
	readonly key: string
	/** The month the year ends in, "Oct 2052". */
	readonly ends: string
	readonly ages: string
	/** The inflation the CLI drew for that year, in percent; null where `traj` states none. */
	readonly inflation: string | null
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
	const returns = new Map(path.returns.map((rollup) => [rollup.index, rollup]))
	return annualRowsOf(path).map((row) => {
		const rollup = returns.get(row.index)
		const states = rollup?.accounts ?? []
		const marks = [
			...(lowestDay !== null && holds(row, lowestDay) ? ["Lowest point"] : []),
			...(path.runsOut !== null && holds(row, path.runsOut.date) ? [RUN_OUT_LABEL] : []),
		]
		return {
			key: String(row.index),
			ends: formatMonth(row.to),
			ages: agesText(row.ages, names.people),
			inflation: rollup?.inflationBps === undefined ? null : returnText(rollup.inflationBps),
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
