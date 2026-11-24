import { declaresEmployer } from "../engine/employer"
import type { Returns } from "../engine/returns"
import { runEngine } from "../engine/run"
import { declaresWithdrawals } from "../loan/resolve"
import { openingNetWorth } from "../output/opening"
import { buildPeriods, type Period } from "../output/periods"
import { buildRollups } from "../output/rollups"
import { accountRules } from "../output/rules"
import { declaresPayouts } from "../payout/flows"
import type { Baseline, DateString, MinorUnits, Scenario, Timeline } from "../types"
import type { ProjectionProblem } from "../types/projection"
import { rollupGrid, rollupObservations } from "./grid"
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

/** One Market path's net worth at every grid period, and the period it ran out in if it did. */
export interface PathOutcome {
	readonly netWorth: readonly MinorUnits[]
	readonly runsOutIndex?: number
	/** What the rule Flows paid in each grid period; present only when the Scenario has a rule Flow. */
	readonly spent?: readonly MinorUnits[]
	/** The path's lowest year of that spending, absent when it has no whole year and did not run out. */
	readonly lowest?: MinorUnits
}

export type PathResult =
	| { readonly ok: true; readonly outcome: PathOutcome }
	| { readonly ok: false; readonly problem: ProjectionProblem }

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
export function outcomeOf(inputs: PathInputs, returns: Returns): PathResult {
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
	const rollups = buildRollups(
		result.run,
		periods,
		inputs.opening,
		declaresWithdrawals(inputs.scenario),
		declaresEmployer(inputs.scenario),
		declaresPayouts(inputs.scenario),
	)
	if (rollups.problem !== undefined) return { ok: false, problem: rollups.problem }
	const annual = rollups.annual!
	const last = annual[annual.length - 1]!
	const netWorth = inputs.grid.map((period) => (annual[period.index] ?? last).closingNetWorth)
	const spent = spentBy(result.run, inputs.scenario, inputs.grid)
	if (!spent.ok) return { ok: false, problem: spent.problem }
	const outcome: PathOutcome = {
		netWorth,
		...(runsOut === undefined ? {} : { runsOutIndex: last.index }),
		...(spent.spent === undefined ? {} : { spent: spent.spent }),
		...(spent.lowest === undefined ? {} : { lowest: spent.lowest }),
	}
	return { ok: true, outcome }
}
