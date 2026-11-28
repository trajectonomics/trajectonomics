import { check } from "../check"
import { checkPathSelection } from "../check/chance"
import { checkReturnModel } from "../check/market"
import { checkReportingOptions } from "../check/reporting"
import { marketPath } from "../market/paths"
import type { Baseline, Scenario, Timeline } from "../types"
import type { PathProjectionResult, PathSelection } from "../types/path"
import type { ProjectionOptions } from "../types/statement"
import { pathReturnsOf } from "./path-returns"
import { projectChecked } from "./project"

/**
 * The Projection of Market path `selection.index` of the run `model` and `seed` define, the one
 * `chanceOfSuccess` reports as `outcomes[index]`, plus the returns it drew per Annual roll-up
 * (ADR 0011). Only that path's draws are made. Never throws on valid-shaped input.
 */
export function projectPath(
	baseline: Baseline,
	scenario: Scenario,
	timeline: Timeline,
	selection: PathSelection,
	options: ProjectionOptions = {},
): PathProjectionResult {
	const problems = [
		...check(baseline, scenario, timeline),
		...checkPathSelection(selection),
		...checkReportingOptions(options.reporting, timeline),
	]
	if (problems.length > 0) return { ok: false, problems }
	const accounts = scenario.accounts.map((account) => account.id)
	const modelProblems = checkReturnModel(selection.model, accounts, timeline)
	if (modelProblems.length > 0) return { ok: false, problems: modelProblems }
	const returns = marketPath(
		selection.model,
		BigInt(`0x${selection.seed}`),
		selection.index,
		timeline,
		scenario.economy.inflation,
	)
	const result = projectChecked(baseline, scenario, timeline, options, returns)
	if (!result.ok) return result
	const { projection } = result
	const rolled = pathReturnsOf(returns, timeline, projection.annual)
	return { ok: true, projection: { ...projection, returns: rolled } }
}
