import type { Returns } from "../engine/returns"
import { runEngine } from "../engine/run"
import { declaredBy } from "../output/declared"
import { openingNetWorth } from "../output/opening"
import { buildPeriods, type Period } from "../output/periods"
import { buildRollups } from "../output/rollups"
import { accountRules } from "../output/rules"
import type { Baseline, DateString, Scenario, Timeline } from "../types"
import { rollupGrid, rollupObservations } from "./grid"
import { lowestOf } from "./lowest"
import type { PathOutcome, PathResult } from "./path-outcome"
import { spentBy } from "./spent"

/** What every Market path of one chance shares: the inputs, the roll-up grid and the opening worth. */
export interface PathInputs {
	readonly baseline: Baseline
	readonly scenario: Scenario
	readonly timeline: Timeline
	readonly grid: readonly Period[]
	readonly observations: readonly DateString[]
	readonly opening: bigint
}

/** The shared inputs of one chance, computed once for all of its Market paths. */
export function pathInputs(baseline: Baseline, scenario: Scenario, timeline: Timeline): PathInputs {
	return {
		baseline,
		scenario,
		timeline,
		grid: rollupGrid(timeline),
		observations: rollupObservations(timeline),
		opening: openingNetWorth(baseline, accountRules(scenario)),
	}
}

/**
 * Runs one Market path through the engine and reads its roll-ups. A path that runs out is pinned,
 * un-grown, at the net worth it died with in every later period, so it still counts in every roll-up.
 */
export function outcomeOf(
	inputs: PathInputs,
	returns: Returns,
	milestoneDates = false,
): PathResult {
	const { timeline } = inputs
	const result = runEngine(
		inputs.baseline,
		inputs.scenario,
		timeline,
		inputs.observations,
		returns,
		{ recordRules: true },
	)
	if (!result.ok) return { ok: false, problem: result.problem }
	const runsOut = result.run.runsOut
	const periods = buildPeriods(timeline.start, runsOut?.date ?? timeline.horizon, runsOut?.date)
	const rollups = buildRollups(result.run, periods, inputs.opening, declaredBy(inputs.scenario))
	if (rollups.problem !== undefined) return { ok: false, problem: rollups.problem }
	const annual = rollups.annual!
	const last = annual[annual.length - 1]!
	const netWorth = inputs.grid.map((period) => (annual[period.index] ?? last).closingNetWorth)
	const spent = spentBy(result.run, inputs.scenario, inputs.grid)
	if (!spent.ok) return { ok: false, problem: spent.problem }
	const outcome: PathOutcome = {
		netWorth,
		lowest: lowestOf(netWorth),
		...(runsOut === undefined
			? {}
			: {
					runsOutIndex: last.index,
					runsOut: { date: runsOut.date, unmet: Number(runsOut.unmet) },
				}),
		...(spent.spent === undefined ? {} : { spent: spent.spent }),
		...(spent.lowest === undefined ? {} : { lowestYear: spent.lowest }),
		...(milestoneDates ? { milestones: result.run.milestones ?? [] } : {}),
	}
	return { ok: true, outcome }
}
