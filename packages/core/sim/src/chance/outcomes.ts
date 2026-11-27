import type { DateString } from "../types"
import type { ChancePathOutcome } from "../types/path"
import type { PathOutcome } from "./path"

/**
 * The Milestones that fired on one path, by id, in the order the run reported them. Built with
 * `Object.fromEntries`, so an id such as `__proto__` is an ordinary key and never sets the prototype.
 */
function firedDates(outcome: PathOutcome): Readonly<Record<string, DateString>> {
	return Object.fromEntries(
		(outcome.milestones ?? [])
			.filter((result) => result.reached)
			.map((result) => [result.id, result.date]),
	)
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
