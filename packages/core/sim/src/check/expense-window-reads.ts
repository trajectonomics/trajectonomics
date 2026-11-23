import type { Emit, Path } from "./codes"
import { accountReadsOf } from "./flow-accounts"
import { isRecord } from "./shape"

const METRICS = ["metric", "base"] as const

function readsAccount(flows: unknown): boolean {
	if (!Array.isArray(flows)) return false
	return flows.some((flow, index) => accountReadsOf(flow, ["scenario", "flows", index]).length > 0)
}

/** Reports each `expenses: next12Months` Metric of one criterion, at the Metric's `expenses` key. */
function reportCriterion(criterion: unknown, at: Path, emit: Emit): void {
	if (!isRecord(criterion)) return
	for (const key of METRICS) {
		const metric = criterion[key]
		if (isRecord(metric) && metric["expenses"] === "next12Months") {
			emit("NEXT_12_MONTHS_READS_ACCOUNT", [...at, key, "expenses"])
		}
	}
}

/**
 * A Milestone's `next12Months` expense window plans each Flow's amounts over a year it has not
 * walked, and a Derived amount that reads an Account would need that Account's value on each of
 * those dates from the run's own forecast. The window cannot have it, so the two do not meet in one
 * Scenario (ADR 0020).
 */
export function checkExpenseWindowReads(scenario: unknown, emit: Emit): void {
	if (!isRecord(scenario) || !readsAccount(scenario["flows"])) return
	const milestones = scenario["milestones"]
	if (!Array.isArray(milestones)) return
	for (let index = 0; index < milestones.length; index++) {
		const milestone: unknown = milestones[index]
		const criteria = isRecord(milestone) ? milestone["criteria"] : undefined
		if (!Array.isArray(criteria)) continue
		for (let position = 0; position < criteria.length; position++) {
			reportCriterion(
				criteria[position],
				["scenario", "milestones", index, "criteria", position],
				emit,
			)
		}
	}
}
