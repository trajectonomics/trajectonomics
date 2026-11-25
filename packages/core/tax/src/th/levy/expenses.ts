import { addSection40_8Expense } from "./expenses-business"
import { addSection40_7Expense } from "./expenses-contracting"
import {
	addSection40_1_2Expense,
	addSection40_3Expense,
	addSection40_4Expense,
} from "./expenses-income"
import { addSection40_6Expense } from "./expenses-professions"
import { addSection40_5Expense } from "./expenses-rental"
import type { ThLevyGraph } from "./graph"
import { sumMeasures } from "./graph-rates"
import { ThLevyMeasureId } from "./measure-ids"
import type { ThLevyExpenseElections } from "./profile-types"
import type { ThLevyTallies } from "./tallies"

/**
 * Emits every Section 40(1)–40(8) expense deduction and totals them.
 *
 * Purpose: Reproduces the calculator's `calculateExpenseDeductions` as Measures.
 * Math: Sum of the seven statutory expense buckets, each already rounded the way its stage does;
 * the Section 40(1)–(2) and 40(3) buckets are the sum over the Filers of each Filer's own.
 * Units: Integer satang Measures.
 * Throws: TaxValidationError if an elected actual expense is invalid.
 *
 * @param graph Measure graph being built.
 * @param tallies Income tally ids.
 * @param elections Standard-versus-actual choices fixed at emit time.
 * @param views Each Filer's tallies. Section 42 bis and 42 ter give each spouse their own 100,000
 * ceiling, so those two expenses are computed per view and added; an elected actual expense is one
 * figure for the Return and reads `tallies`. Omitted is one view, `tallies`.
 * @statute Thailand Revenue Code Sections 42 bis, 42 ter, 43–46; Royal Decree No. 11.
 */
export function addExpenseMeasures(
	graph: ThLevyGraph,
	tallies: ThLevyTallies,
	elections: ThLevyExpenseElections = {},
	views: readonly ThLevyTallies[] = [tallies],
): string {
	const royalties = elections.section40_3?.election === "actual" ? [tallies] : views
	const buckets = [
		sumMeasures(
			graph,
			views.map((view) => addSection40_1_2Expense(graph, view)),
		),
		sumMeasures(
			graph,
			royalties.map((view) => addSection40_3Expense(graph, view, elections.section40_3)),
		),
		addSection40_4Expense(graph),
		addSection40_5Expense(graph, tallies, elections.section40_5),
		addSection40_6Expense(graph, tallies, elections.section40_6),
		addSection40_7Expense(graph, tallies, elections.section40_7),
		addSection40_8Expense(graph, tallies, elections.section40_8),
	]
	return sumMeasures(graph, buckets, ThLevyMeasureId.ExpensesTotal)
}
