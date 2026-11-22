import type { Baseline, Scenario, Timeline } from "../types"
import type { SurvivalOptions } from "../types/financial-independence"
import type { SurvivalFinancialIndependenceResult } from "../types/financial-independence-result"
import { unreachable } from "./binding"
import { survivalDefinition } from "./definition"
import { planScan } from "./plan"
import { search } from "./search"
import { stoppedLevies } from "./stopped-levies"

/** The survival answer: the earliest candidate month whose stopped path survives. */
export function runSurvival(
	baseline: Baseline,
	scenario: Scenario,
	timeline: Timeline,
	options: SurvivalOptions,
): SurvivalFinancialIndependenceResult {
	const definition = survivalDefinition(options)
	const plan = planScan(baseline, scenario, timeline, options)
	if (plan === undefined)
		return { ok: true, financialIndependence: unreachable(definition, undefined, undefined) }
	const outcome = search(plan.input, plan.scanned)
	if (outcome.kind === "problem") return { ok: false, problems: [outcome.problem] }
	if (outcome.kind === "reachable") {
		const stopped = stoppedLevies(outcome.point, timeline.horizon)
		if (!stopped.ok) return { ok: false, problems: [stopped.problem] }
		return {
			ok: true,
			financialIndependence: {
				reachable: true,
				definition,
				month: outcome.month,
				reference: outcome.reference,
				...(stopped.levies === undefined ? {} : { levies: stopped.levies }),
			},
		}
	}
	const problem = plan.input.prefix.problem
	if (problem !== undefined) return { ok: false, problems: [problem] }
	return {
		ok: true,
		financialIndependence: unreachable(definition, outcome.buffer, outcome.shortfall),
	}
}
