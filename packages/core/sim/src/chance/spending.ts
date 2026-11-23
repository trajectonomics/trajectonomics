import type { Period } from "../output/periods"
import type { MinorUnits } from "../types"
import type { ChanceLowestYear, ChanceSpending, ChanceSpendingBand } from "../types/chance"
import { percentiles } from "./band"
import type { PathOutcome } from "./path"
import { ascending } from "./rank"

/** The nearest-rank Percentiles of what the rule Flows paid across every Market path in one roll-up. */
function spendingBandAt(
	period: Period,
	spent: readonly (readonly MinorUnits[])[],
): ChanceSpendingBand {
	const sorted = ascending(spent.map((path) => path[period.index]!))
	return { index: period.index, to: period.to, spending: percentiles(sorted) }
}

/** The last roll-up that is a whole year; only the final one can be clipped by the horizon. */
function lastFull(grid: readonly Period[]): number {
	return grid[grid.length - 1]!.partial ? grid.length - 2 : grid.length - 1
}

/**
 * One path's lowest roll-up spending, from the first roll-up its rule Flows paid something in through
 * the last full roll-up; `undefined` when it paid in none, or first paid after the last full one.
 */
function lowestOf(spent: readonly MinorUnits[], last: number): MinorUnits | undefined {
	const first = spent.findIndex((value) => value > 0)
	if (first < 0 || first > last) return undefined
	return Math.min(...spent.slice(first, last + 1))
}

function lowestYear(
	spent: readonly (readonly MinorUnits[])[],
	grid: readonly Period[],
): ChanceLowestYear {
	const last = lastFull(grid)
	const lows = spent.flatMap((path) => lowestOf(path, last) ?? [])
	return { paths: lows.length, spending: lows.length === 0 ? [] : percentiles(ascending(lows)) }
}

/** The spending Bands and the lowest-year Percentiles of a run whose Scenario has a rule Flow. */
export function spendingOf(
	outcomes: readonly PathOutcome[],
	grid: readonly Period[],
): ChanceSpending | undefined {
	const spent = outcomes.flatMap((outcome) => (outcome.spent === undefined ? [] : [outcome.spent]))
	if (spent.length === 0) return undefined
	return {
		bands: grid.map((period) => spendingBandAt(period, spent)),
		lowestYear: lowestYear(spent, grid),
	}
}
