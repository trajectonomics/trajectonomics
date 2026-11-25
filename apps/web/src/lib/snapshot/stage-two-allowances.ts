import type { PlanParams } from "./params"
import type { PlannedRead } from "./planned"
import { perScenario, projectionFlags, scenarioFlag } from "./stage-two-projections"

/**
 * One `projection allowances` per Scenario, when the Snapshot states the inputs (cli ADR-0061). The step is
 * required and has no default in the CLI; the labels follow the person's order. A Scenario with no Levy is
 * refused by the CLI, so the runner reads only the plans whose document holds one. The Carry-in goes on
 * standard input, as for a run, because the year the As-of falls in needs it.
 */
export function planAllowances(params: PlanParams, names: string[]): Record<string, PlannedRead> {
	const plan = params.allowances
	if (plan === null) return {}
	const limits = [
		...(plan.budget === null ? [] : ["--budget", plan.budget]),
		...(plan.minSaving === null ? [] : ["--min-saving", plan.minSaving]),
	]
	return perScenario(params, names, (name) => [
		"projection",
		"allowances",
		scenarioFlag(name),
		...projectionFlags(params),
		"--labels",
		plan.labels.join(","),
		"--step",
		plan.step,
		...limits,
		"--json",
	])
}
