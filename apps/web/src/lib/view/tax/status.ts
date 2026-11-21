import type { ProjectionRun } from "../../contract"

/** The tax status a result states, in the words the page shows. */
export function taxStatusWords(status: ProjectionRun["tax"]): string {
	if (status === "applied") return "Tax applied"
	if (status === "mixed") return "Tax mixed across the two Scenarios"
	return "Tax not applied"
}
