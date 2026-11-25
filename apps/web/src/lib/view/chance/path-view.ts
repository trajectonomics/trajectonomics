import { dayPosition, type LineMarker } from "../../chart"
import type { ProjectionChance, ProjectionPath } from "../../contract"
import { formatMonth } from "../../format"
import { agesText } from "../household/model"
import { type ItemNames, NO_ITEM_NAMES } from "../item-names"
import { milestoneMarkers } from "../milestones/milestones"
import { type AnnualRow, annualRowsOf } from "../projection/annual"
import { lowestWhen, pathTitle, returnText } from "./path-words"

/** The label of the run-out rule on the chart. */
export const RUN_OUT_LABEL = "Ran out"

/** How a future ended, from its own read: when it ran out and what it could not pay, or that it lasted to the Horizon. */
export interface Ending {
	readonly ranOut: string | null
	/** The shortfall the CLI states on the run-out date, or null when it lasted. */
	readonly unmet: string | null
	readonly horizon: string
}

/** What the CLI stated of a path in the chance's `outcomes`, when the Snapshot lists them. */
export interface Lowest {
	readonly amount: string
	/** The year it was lowest in, in the table's own terms: "in the year ending Oct 2052". */
	readonly when: string
	/** That roll-up's first day, as the CLI states it: the year row it marks in the table. */
	readonly day: string
}

/** The header of a path page. */
export interface PathHeader {
	readonly title: string
	readonly ending: Ending
	readonly closing: string | null
	readonly lowest: Lowest | null
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

/** The Account ids the table has a column for, in the order the CLI lists them in the first roll-up. */
export function returnAccounts(path: ProjectionPath): string[] {
	return (path.returns[0]?.accounts ?? []).map((entry) => entry.account)
}

/** The path's header: its title, how it ended, and the figures the chance's outcomes state of it. */
export function pathHeaderOf(path: ProjectionPath, chance: ProjectionChance): PathHeader {
	const outcome = chance.outcomes?.find((entry) => entry.index === path.index)
	return {
		title: pathTitle(path.index, path.definition.paths),
		ending: {
			ranOut: path.runsOut === null ? null : formatMonth(path.runsOut.date),
			unmet: path.runsOut === null ? null : path.runsOut.unmet,
			horizon: path.horizon,
		},
		closing: outcome?.closingNetWorth ?? null,
		lowest:
			outcome === undefined
				? null
				: {
						amount: outcome.lowestNetWorth,
						when: lowestWhen(path, outcome.lowestYear),
						day: outcome.lowestYear,
					},
	}
}

/**
 * The marks on the chart: each reached Milestone as the Projection page draws it, and the run-out as a rule where the
 * money ran out. A date outside every year row is not drawn; the header still says it.
 */
export function pathMarkers(path: ProjectionPath, names: ItemNames = NO_ITEM_NAMES): LineMarker[] {
	const markers = milestoneMarkers(path, names)
	if (path.runsOut === null) return markers
	const x = dayPosition(annualRowsOf(path), path.runsOut.date)
	return x === null ? markers : [...markers, { x, label: RUN_OUT_LABEL }]
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
