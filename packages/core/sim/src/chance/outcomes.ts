import type { ChancePathOutcome } from "../types/path"
import type { PathOutcome } from "./path"

/** Each Market path's outcome in index order, read from the figures the Bands were read from. */
export function pathOutcomes(outcomes: readonly PathOutcome[]): ChancePathOutcome[] {
	return outcomes.map((outcome, index) => ({
		index,
		closingNetWorth: outcome.netWorth[outcome.netWorth.length - 1]!,
		lowestNetWorth: outcome.lowest.value,
		lowestAt: outcome.lowest.at,
		...(outcome.runsOut === undefined ? {} : { runsOut: outcome.runsOut }),
	}))
}
