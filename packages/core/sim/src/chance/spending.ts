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

/** The lowest-year Percentiles over the paths that have one; the count says how many did. */
function lowestYear(outcomes: readonly PathOutcome[]): ChanceLowestYear {
	const lows = outcomes.flatMap((outcome) => outcome.lowest ?? [])
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
		lowestYear: lowestYear(outcomes),
	}
}
