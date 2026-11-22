import { check } from "../check"
import { checkChanceOptions } from "../check/chance"
import { checkReturnModel } from "../check/market"
import { marketReturns } from "../market/paths"
import type { Baseline, Scenario, Timeline } from "../types"
import type { ChanceOfSuccessOptions, ChanceOfSuccessResult } from "../types/chance"
import { outcomeOf, type PathInputs, type PathOutcome, pathInputs } from "./path"
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
	return outcomesOf(pathInputs(baseline, scenario, timeline), options)
}

function outcomesOf(inputs: PathInputs, options: ChanceOfSuccessOptions): ChanceOfSuccessResult {
	const seed = BigInt(`0x${options.seed}`)
	const outcomes: PathOutcome[] = []
	for (const returns of marketReturns(options.model, seed, options.paths, inputs.timeline)) {
		const result = outcomeOf(inputs, returns)
		if (!result.ok) return { ok: false, problems: [result.problem] }
		outcomes.push(result.outcome)
	}
	return { ok: true, chance: summarise(options, outcomes, inputs.grid) }
}
