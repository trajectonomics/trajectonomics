import type { ProjectionRun } from "../../contract"
import { lineKey, lineLabel } from "../cashflow/cashflow-labels"
import { annualRowsOf } from "../projection/annual"
import type { Resolved } from "./types"
import { periodsOf, pointAt } from "./year"

const PREFIX = {
	income: "Income",
	expense: "Expense",
	category: "Spending on",
	contribution: "Saving",
	withdrawal: "Withdrawal",
} as const

/** The cash-flow line's id and name, which is the same for every year it appears in. */
function lineHeader(
	line: Parameters<typeof lineKey>[0] & { group: string },
	accountNames: ReadonlyMap<string, string>,
): { id: string; name: string } | null {
	const prefix = PREFIX[line.group as keyof typeof PREFIX]
	if (prefix === undefined) return null
	return { id: `cash:${lineKey(line)}`, name: `${prefix}: ${lineLabel(line, accountNames)}` }
}

/** The cash-flow lines by Flow and by category, each as one series that follows its line from year to year. */
export function cashflowFigures(
	run: ProjectionRun,
	accountNames: ReadonlyMap<string, string>,
): Resolved[] {
	const ends = new Map(annualRowsOf(run).map((row) => [row.index, row.to]))
	const periods = periodsOf(run)
	const byKey = new Map<string, Resolved & { nominal: Resolved["nominal"][number][] }>()
	const lines = run.tables.flatMap((table) => (table.name === "cashflow" ? table.rows : []))
	for (const line of lines) {
		const head = lineHeader(line, accountNames)
		const end = ends.get(line.index)
		if (head === null || end === undefined) continue
		const found = byKey.get(head.id) ?? {
			...head,
			group: "money" as const,
			nominal: [],
			real: null,
		}
		found.nominal.push(pointAt(end, line.amount, periods.get(end) ?? null))
		byKey.set(head.id, found)
	}
	return [...byKey.values()]
}

/** Each Account's value at the close of each year, nominal and real (`--accounts`). */
export function accountFigures(
	run: ProjectionRun,
	accountNames: ReadonlyMap<string, string>,
): Resolved[] {
	const periods = periodsOf(run)
	const byAccount = new Map<
		string,
		{ nominal: Resolved["nominal"][number][]; real: Resolved["nominal"][number][] }
	>()
	for (const table of run.tables) {
		if (table.name !== "balances") continue
		for (const row of table.rows) {
			if (!periods.has(row.date)) continue
			const found = byAccount.get(row.account) ?? { nominal: [], real: [] }
			const period = periods.get(row.date) ?? null
			found.nominal.push(pointAt(row.date, row.amount, period))
			found.real.push(pointAt(row.date, row.real, period))
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
