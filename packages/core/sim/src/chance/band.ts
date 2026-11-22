import type { Period } from "../output/periods"
import type { ChanceBand } from "../types/chance"
import type { PathOutcome } from "./path"
import { ascending, nearestRank } from "./rank"

/** The Percentile levels every Band reports. */
export const BAND_LEVELS: readonly number[] = [10, 25, 50, 75, 90]

/** The net-worth Percentiles across every Market path at one Annual roll-up end date. */
export function bandAt(period: Period, outcomes: readonly PathOutcome[]): ChanceBand {
	const sorted = ascending(outcomes.map((outcome) => outcome.netWorth[period.index]!))
	return {
		index: period.index,
		to: period.to,
		netWorth: BAND_LEVELS.map((level) => ({ level, value: nearestRank(sorted, level) })),
	}
}
