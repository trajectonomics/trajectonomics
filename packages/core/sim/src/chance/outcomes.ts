import type { DateString } from "../types"
import type { ChancePathOutcome } from "../types/path"
import type { PathOutcome } from "./path"

/** The Milestones that fired on one path, by id, in the order the run reported them. */
function firedDates(outcome: PathOutcome): Readonly<Record<string, DateString>> {
	const fired: Record<string, DateString> = {}
	for (const result of outcome.milestones ?? []) {
		if (result.reached) fired[result.id] = result.date
	}
	return fired
}

/** Each Market path's outcome in index order, read from the figures the Bands were read from. */
export function pathOutcomes(
	outcomes: readonly PathOutcome[],
	milestoneDates: boolean,
): ChancePathOutcome[] {
	return outcomes.map((outcome, index) => ({
		index,
		closingNetWorth: outcome.netWorth[outcome.netWorth.length - 1]!,
		lowestNetWorth: outcome.lowest.value,
		lowestAt: outcome.lowest.at,
		...(outcome.runsOut === undefined ? {} : { runsOut: outcome.runsOut }),
		...(milestoneDates ? { milestones: firedDates(outcome) } : {}),
	}))
}
