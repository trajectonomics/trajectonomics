import type { Criterion, Metric, Milestone } from "../types"

function readsWindow(metric: Metric): boolean {
	return (
		typeof metric === "object" && "expenses" in metric && metric.expenses === "trailing12Months"
	)
}

function criterionReads(criterion: Criterion): boolean {
	if (criterion.kind === "metric") return readsWindow(criterion.metric)
	return (
		criterion.kind === "multiple" && (readsWindow(criterion.metric) || readsWindow(criterion.base))
	)
}

/** Whether any Milestone reads the trailing twelve months: only then does a run keep what it spent. */
export function readsTrailing(milestones: readonly Milestone[]): boolean {
	return milestones.some((milestone) => milestone.criteria.some(criterionReads))
}
