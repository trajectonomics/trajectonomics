import type { ChanceOfSuccess, ChancePathOutcome } from "@trajectonomics/core/sim"
import type { ChanceOutcomeView, ChanceRepresentativeView } from "./chance-outcomes-view"
import type { Money } from "./chance-spending"
import { addDays } from "./dates"

/*
 * `projection chance --outcomes` (cli ADR-0069): the engine's Path outcomes in the CLI's money, and the
 * indexes of the paths worth opening. Picking an index by rank is a comparison of the engine's own
 * integers, not money arithmetic (cli ADR-0058): no figure is computed here, and no money string is read back.
 */

/** The Percentile levels whose paths `representative` names. */
const LEVELS = { p10: 10, p50: 50, p90: 90 } as const

/** What `--outcomes` adds to the result. */
export type OutcomeAdditions = {
	outcomes: ChanceOutcomeView[]
	representative: ChanceRepresentativeView
}

/**
 * The first day of the roll-up that holds a path's lowest net worth: the Timeline's start for the
 * first roll-up, otherwise the day after the previous roll-up's last day (the roll-ups tile the Timeline).
 */
function rollupStart(start: string, bands: ChanceOfSuccess["bands"], at: number): string {
	const before = bands[at - 1]
	return before === undefined ? start : addDays(before.to, 1)
}

/** The path at nearest rank `level`: `ceil(level × N / 100)` of the paths ascending by closing net worth. */
function atRank(ascending: readonly ChancePathOutcome[], level: number): number {
	const rank = Math.floor((level * ascending.length + 99) / 100)
	return ascending[rank - 1]!.index
}

/** Closing net worth ascending, a tie going to the lower index, so every pick is reproducible. */
function byClosing(left: ChancePathOutcome, right: ChancePathOutcome): number {
	if (left.closingNetWorth !== right.closingNetWorth) {
		return left.closingNetWorth < right.closingNetWorth ? -1 : 1
	}
	return left.index - right.index
}

/** The path that ran out first by date, then by index; null when none ran out. */
function earliestRunsOut(outcomes: readonly ChancePathOutcome[]): number | null {
	let best: ChancePathOutcome | undefined
	for (const outcome of outcomes) {
		if (outcome.runsOut === undefined) continue
		if (best?.runsOut === undefined || outcome.runsOut.date < best.runsOut.date) best = outcome
	}
	return best?.index ?? null
}

/** The path with the least `lowestNetWorth`; the lower index on a tie. */
function lowestPath(outcomes: readonly ChancePathOutcome[]): number {
	let best = outcomes[0]!
	for (const outcome of outcomes) {
		if (outcome.lowestNetWorth < best.lowestNetWorth) best = outcome
	}
	return best.index
}

/** The engine's outcomes as the result states them, or nothing when the engine reported none. */
export function outcomesOf(
	chance: ChanceOfSuccess,
	start: string,
	money: Money,
): OutcomeAdditions | undefined {
	const { outcomes } = chance
	if (outcomes === undefined || outcomes.length === 0) return undefined
	const ascending = [...outcomes].sort(byClosing)
	return {
		outcomes: outcomes.map((outcome) => ({
			index: outcome.index,
			closingNetWorth: money(outcome.closingNetWorth),
			lowestNetWorth: money(outcome.lowestNetWorth),
			lowestYear: rollupStart(start, chance.bands, outcome.lowestAt),
			runsOut:
				outcome.runsOut === undefined
					? null
					: { date: outcome.runsOut.date, unmet: money(outcome.runsOut.unmet) },
			...(outcome.milestones === undefined ? {} : { milestones: { ...outcome.milestones } }),
		})),
		representative: {
			p10: atRank(ascending, LEVELS.p10),
			p50: atRank(ascending, LEVELS.p50),
			p90: atRank(ascending, LEVELS.p90),
			earliestRunsOut: earliestRunsOut(outcomes),
			lowest: lowestPath(outcomes),
		},
	}
}
