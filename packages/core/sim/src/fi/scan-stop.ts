import type { Flow } from "../types"

/**
 * The Flows an FI candidate stops: earned income, and expenses too when retirement spending
 * replaces them. Applies to a Flow's events and to a deferred `once` Flow that lands later.
 */
export function stopsFlow(retirement: boolean): (flow: Flow) => boolean {
	return (flow) =>
		(flow.kind === "income" && flow.earned) || (retirement && flow.kind === "expense")
}
