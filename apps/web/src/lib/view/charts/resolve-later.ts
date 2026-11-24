import type { ProjectionRun } from "../../contract"
import type { Resolved } from "./types"
import { periodsOf, pointAt } from "./year"

/** Each tax year's due and, when `traj` states it, its taxable income, one series per Levy. */
export function taxFigures(run: ProjectionRun): Resolved[] {
	const at = (year: ProjectionRun["taxYears"][number], amount: string) =>
		pointAt(year.to, amount, { from: year.from, partial: year.partial })
	const levies = [...new Set(run.taxYears.map((year) => year.levy))]
	return levies.flatMap((levy) => {
		const years = run.taxYears.filter((year) => year.levy === levy)
		const taxable = years.flatMap((year) =>
			year.taxableIncome === undefined ? [] : [at(year, year.taxableIncome)],
		)
		const due: Resolved = {
			id: `tax:${levy}:due`,
			name: `Tax due, ${levy}`,
			group: "tax",
			nominal: years.map((year) => at(year, year.due)),
			real: null,
		}
		const income: Resolved = {
			id: `tax:${levy}:taxable`,
			name: `Taxable income, ${levy}`,
			group: "tax",
			nominal: taxable,
			real: null,
		}
		return taxable.length === 0 ? [due] : [due, income]
	})
}

/** What each spending rule paid in each Rule year, nominal and in today's money, and what heirs would receive. */
export function retirementFigures(run: ProjectionRun): Resolved[] {
	const out: Resolved[] = []
	const periods = periodsOf(run)
	const at = (date: string, amount: string) => pointAt(date, amount, periods.get(date) ?? null)
	for (const table of run.tables) {
		if (table.name === "spendingRules") {
			const flows = [...new Set(table.rows.map((row) => row.flow))]
			for (const flow of flows) {
				const rows = table.rows.filter((row) => row.flow === flow)
				out.push({
					id: `rule:${flow}`,
					name: `Paid by the spending rule ${flow}`,
					group: "retirement",
					nominal: rows.map((row) => at(row.date, row.paid)),
					real: rows.map((row) => at(row.date, row.realPaid)),
				})
			}
		}
		if (table.name === "estate" && table.rows.length > 0) {
			out.push({
				id: "estate:heirs",
				name: "What heirs would receive",
				group: "retirement",
				nominal: table.rows.map((row) => at(row.date, row.toHeirs)),
				real: table.rows.map((row) => at(row.date, row.realToHeirs)),
			})
		}
	}
	return out
}
