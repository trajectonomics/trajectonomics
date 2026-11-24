import type { ProjectionRun } from "../../contract"
import { lineKey, lineLabel } from "../cashflow/cashflow-labels"
import { annualRowsOf } from "../projection/annual"
import type { Resolved } from "./types"
import { pointAt } from "./year"

const PREFIX = {
	income: "Income",
	expense: "Expense",
	category: "Spending on",
	contribution: "Saving",
	withdrawal: "Withdrawal",
} as const

/** The cash-flow lines by Flow and by category, each as one series that follows its line from year to year. */
export function cashflowFigures(
	run: ProjectionRun,
	accountNames: ReadonlyMap<string, string>,
): Resolved[] {
	const ends = new Map(annualRowsOf(run).map((row) => [row.index, row.to]))
	const byKey = new Map<string, Resolved & { nominal: Resolved["nominal"][number][] }>()
	for (const table of run.tables) {
		if (table.name !== "cashflow") continue
		for (const line of table.rows) {
			const prefix = PREFIX[line.group as keyof typeof PREFIX]
			const end = ends.get(line.index)
			if (prefix === undefined || end === undefined) continue
			const id = `cash:${lineKey(line)}`
			const found = byKey.get(id) ?? {
				id,
				name: `${prefix}: ${lineLabel(line, accountNames)}`,
				group: "money" as const,
				nominal: [],
				real: null,
			}
			found.nominal.push(pointAt(end, line.amount))
			byKey.set(id, found)
		}
	}
	return [...byKey.values()]
}

/** Each Account's value at the close of each year, nominal and real (`--accounts`). */
export function accountFigures(
	run: ProjectionRun,
	accountNames: ReadonlyMap<string, string>,
): Resolved[] {
	const ends = new Set(annualRowsOf(run).map((row) => row.to))
	const byAccount = new Map<
		string,
		{ nominal: Resolved["nominal"][number][]; real: Resolved["nominal"][number][] }
	>()
	for (const table of run.tables) {
		if (table.name !== "balances") continue
		for (const row of table.rows) {
			if (!ends.has(row.date)) continue
			const found = byAccount.get(row.account) ?? { nominal: [], real: [] }
			found.nominal.push(pointAt(row.date, row.amount))
			found.real.push(pointAt(row.date, row.real))
			byAccount.set(row.account, found)
		}
	}
	return [...byAccount].map(([account, points]) => ({
		id: `account:${account}`,
		name: `Value of ${accountNames.get(account) ?? account}`,
		group: "net-worth" as const,
		...points,
	}))
}
