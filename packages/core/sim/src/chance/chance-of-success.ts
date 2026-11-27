import { check } from "../check"
import { checkChanceOptions } from "../check/chance"
import { checkReturnModel } from "../check/market"
import { marketReturns } from "../market/paths"
import { withPayouts } from "../payout/flows"
import type { Baseline, Scenario, Timeline } from "../types"
import type { ChanceOfSuccessOptions, ChanceOfSuccessResult } from "../types/chance"
import { outcomeOf, type PathInputs, pathInputs } from "./path"
import type { PathOutcome } from "./path-outcome"
import { summarise } from "./summary"

/** Runs every seeded Market path through the plan as written; never throws on valid-shaped input. */
export function chanceOfSuccess(
	baseline: Baseline,
	scenario: Scenario,
	timeline: Timeline,
	options: ChanceOfSuccessOptions,
): ChanceOfSuccessResult {
	const problems = [...check(baseline, scenario, timeline), ...checkChanceOptions(options)]
	if (problems.length > 0) return { ok: false, problems }
	const accounts = scenario.accounts.map((account) => account.id)
	const modelProblems = checkReturnModel(options.model, accounts, timeline)
	if (modelProblems.length > 0) return { ok: false, problems: modelProblems }
	return outcomesOf(pathInputs(baseline, withPayouts(scenario), timeline), options)
}

function outcomesOf(inputs: PathInputs, options: ChanceOfSuccessOptions): ChanceOfSuccessResult {
	const seed = BigInt(`0x${options.seed}`)
	const outcomes: PathOutcome[] = []
	for (const returns of marketReturns(options.model, seed, options.paths, inputs.timeline)) {
		const result = outcomeOf(inputs, returns, options.milestoneDates === true)
		if (!result.ok) return { ok: false, problems: [result.problem] }
		outcomes.push(result.outcome)
	}
	return { ok: true, chance: summarise(options, outcomes, inputs.grid, milestoneIds(inputs)) }
}

/** The Scenario's Milestone ids in order, or none when it declares no Milestones. */
function milestoneIds(inputs: PathInputs): readonly string[] {
	return inputs.scenario.milestones?.map((milestone) => milestone.id) ?? []
}
