import type { Period } from "../output/periods"
import type { MinorUnits } from "../types"
import type { ChanceBand, ChancePercentile } from "../types/chance"
import type { PathOutcome } from "./path-outcome"
import { ascending, nearestRank } from "./rank"

/** The Percentile levels every Band reports. */
export const BAND_LEVELS: readonly number[] = [10, 25, 50, 75, 90]

/** The nearest-rank Percentile at every level of an ascending, non-empty sample. */
export function percentiles(sorted: readonly MinorUnits[]): ChancePercentile[] {
	return BAND_LEVELS.map((level) => ({ level, value: nearestRank(sorted, level) }))
}

/** The nearest-rank Percentiles of one sample per Market path at one Annual roll-up end date. */
export function bandOf(period: Period, samples: readonly MinorUnits[]): ChanceBand {
	return { index: period.index, to: period.to, netWorth: percentiles(ascending(samples)) }
}

/** The net-worth Percentiles across every Market path at one Annual roll-up end date. */
export function bandAt(period: Period, outcomes: readonly PathOutcome[]): ChanceBand {
	return bandOf(
		period,
		outcomes.map((outcome) => outcome.netWorth[period.index]!),
	)
}
