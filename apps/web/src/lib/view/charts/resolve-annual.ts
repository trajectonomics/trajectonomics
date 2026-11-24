import type { ProjectionRun } from "../../contract"
import { type AnnualRow, annualRowsOf } from "../projection/annual"
import type { Period, Resolved } from "./types"
import { pointAt } from "./year"

/** The period an annual row covers. */
function periodOf(row: AnnualRow): Period {
	return { from: row.from, partial: row.partial }
}

/** One annual figure as a series, or nothing when no row states it. */
function annualSeries(
	rows: readonly AnnualRow[],
	spec: {
		id: string
		name: string
		group: Resolved["group"]
		amount: (row: AnnualRow) => string | undefined
		real?: (row: AnnualRow) => string
	},
): Resolved[] {
	const nominal = rows.flatMap((row) => {
		const amount = spec.amount(row)
		return amount === undefined ? [] : [pointAt(row.to, amount, periodOf(row))]
	})
	if (nominal.length === 0) return []
	const real = spec.real
	return [
		{
			id: spec.id,
			name: spec.name,
			group: spec.group,
			nominal,
			real: real ? rows.map((row) => pointAt(row.to, real(row), periodOf(row))) : null,
		},
	]
}

/** The roll-up's own figures: net worth (with its real figure), income, expenses, contributions, interest and withdrawals. */
export function annualFigures(run: ProjectionRun): Resolved[] {
	const rows = annualRowsOf(run)
	const money = (id: string, name: string, amount: (row: AnnualRow) => string | undefined) =>
		annualSeries(rows, { id, name, group: "money", amount })
	return [
		...annualSeries(rows, {
			id: "net-worth",
			name: "Net worth at the close of the year",
			group: "net-worth",
			amount: (row) => row.closingNetWorth,
			real: (row) => row.realNetWorth.amount,
		}),
		...money("income", "Income", (row) => row.income),
		...money("expenses", "Expenses", (row) => row.expense),
		...money("contributions", "Contributions", (row) => row.contributions),
		...money("unfunded", "Unfunded contributions", (row) => row.unfundedContributions),
		...money("interest", "Interest", (row) => row.interest),
		...money("withdrawals", "Withdrawals", (row) => row.withdrawals),
	]
}
