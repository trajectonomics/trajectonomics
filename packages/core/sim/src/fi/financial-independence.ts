import { check } from "../check"
import { checkFinancialIndependenceOptions } from "../check/financial-independence"
import { checkReturnModel } from "../check/market"
import { withPayouts } from "../payout/flows"
import type { Baseline, ReturnModel, Scenario, Timeline } from "../types"
import type {
	FinancialIndependenceOptions,
	ProbabilityThresholdOptions,
	SurvivalOptions,
} from "../types/financial-independence"
import type {
	FinancialIndependenceResult,
	ProbabilityFinancialIndependenceResult,
	SurvivalFinancialIndependenceResult,
} from "../types/financial-independence-result"
import { derivedDebtPaymentProblem, derivedExpenseProblem } from "./derived-earned"
import { runProbability } from "./probability-run"
import { runSurvival } from "./run-survival"

/**
 * The earliest month at which stopping earned income passes the FI test: for `survival` on one
 * deterministic Projection, for `probabilityThreshold` on at least `thresholdBps` of Market paths.
 */
export function financialIndependence(
	baseline: Baseline,
	scenario: Scenario,
	timeline: Timeline,
	options: SurvivalOptions,
	model?: ReturnModel,
): SurvivalFinancialIndependenceResult
export function financialIndependence(
	baseline: Baseline,
	scenario: Scenario,
	timeline: Timeline,
	options: ProbabilityThresholdOptions,
	model: ReturnModel,
): ProbabilityFinancialIndependenceResult
export function financialIndependence(
	baseline: Baseline,
	scenario: Scenario,
	timeline: Timeline,
	options: FinancialIndependenceOptions,
	model?: ReturnModel,
): FinancialIndependenceResult
export function financialIndependence(
	baseline: Baseline,
	declared: Scenario,
	timeline: Timeline,
	options: FinancialIndependenceOptions,
	model?: ReturnModel,
): FinancialIndependenceResult {
	const problems = [
		...check(baseline, declared, timeline),
		...checkFinancialIndependenceOptions(options),
	]
	if (problems.length > 0) return { ok: false, problems }
	const scenario = withPayouts(declared)
	const derived =
		(options.retirementSpending === undefined ? derivedExpenseProblem(scenario) : undefined) ??
		derivedDebtPaymentProblem(scenario)
	if (derived !== undefined) return { ok: false, problems: [derived] }
	if (options.method === "survival") return runSurvival(baseline, scenario, timeline, options)
	if (model === undefined) {
		return { ok: false, problems: [{ code: "MISSING_KEY", path: ["model"] }] }
	}
	const modelProblems = checkReturnModel(
		model,
		scenario.accounts.map((item) => item.id),
		timeline,
	)
	if (modelProblems.length > 0) return { ok: false, problems: modelProblems }
	return runProbability(baseline, scenario, timeline, options, model)
}
