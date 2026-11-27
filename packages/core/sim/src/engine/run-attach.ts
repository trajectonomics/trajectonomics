import type { OwedTracker } from "./owed-tracker"
import type { EngineResult } from "./result"
import type { RuleBook } from "./rule-book"

/** Attaches the owed tracker's paid-off dates, when the run tracks liabilities. */
export function attachTracker(
	result: EngineResult,
	tracker: OwedTracker | undefined,
): EngineResult {
	if (!result.ok || tracker === undefined) return result
	return { ok: true, run: { ...result.run, paidOff: tracker.paidOff } }
}

/** Attaches the rule Flows' Rule years, when the Scenario declares one. */
export function attachRules(result: EngineResult, rules: RuleBook | undefined): EngineResult {
	if (!result.ok || rules === undefined) return result
	return { ok: true, run: { ...result.run, rules } }
}
