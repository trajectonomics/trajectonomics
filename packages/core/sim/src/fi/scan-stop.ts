import type { Flow } from "../types"

/**
 * Work an FI candidate stops: earned income, and the employer's Contribution that is paid only while
 * the person works, fixed or derived (ADR 0026).
 */
export function isWork(flow: Flow): boolean {
	return (
		(flow.kind === "income" && flow.earned) ||
		(flow.kind === "contribution" && flow.funding === "employer")
	)
}

/**
 * The Flows an FI candidate stops: work, and expenses too when retirement spending replaces them.
 * Applies to a Flow's events and to a deferred `once` Flow that lands later.
 */
export function stopsFlow(retirement: boolean): (flow: Flow) => boolean {
	return (flow) => isWork(flow) || (retirement && flow.kind === "expense")
}
