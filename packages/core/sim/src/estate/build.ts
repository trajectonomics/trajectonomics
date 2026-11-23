import type {
	EstateStatement,
	ProjectionProblem,
	ProjectionRow,
	Scenario,
	Timeline,
} from "../types"
import { estateStatement } from "./statement"

export type EstateOutcome =
	| { readonly statements: readonly EstateStatement[] }
	| { readonly problem: ProjectionProblem }

/**
 * One Estate statement per Projection row, in order, read from the row's own balances. It never feeds
 * back into the run, so no other figure depends on the estate block (ADR 0025).
 */
export function buildEstate(
	rows: readonly ProjectionRow[],
	scenario: Scenario,
	timeline: Timeline,
): EstateOutcome {
	const liabilities = new Set(
		scenario.accounts.filter((account) => account.kind === "liability").map((a) => a.id),
	)
	const statements: EstateStatement[] = []
	for (const row of rows) {
		const outcome = estateStatement(row, scenario.estate, scenario, timeline, liabilities)
		if ("problem" in outcome) return outcome
		statements.push(outcome.statement)
	}
	return { statements }
}
