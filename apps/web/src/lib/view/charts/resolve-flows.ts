import type { ProjectionRun } from "../../contract"
import { lineKey, lineLabel } from "../cashflow/cashflow-labels"
import { type ItemNames, NO_ITEM_NAMES } from "../item-names"
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
	names: ItemNames,
): { id: string; name: string } | null {
	const prefix = PREFIX[line.group as keyof typeof PREFIX]
	if (prefix === undefined) return null
	return { id: `cash:${lineKey(line)}`, name: `${prefix}: ${lineLabel(line, names)}` }
}

/** A series while it is collected, with the id its name takes when another series of the run would read the same. */
interface Collected extends Resolved {
	readonly nominal: Resolved["nominal"][number][]
	/** The Flow, Account or category the line names; the series id when it names none (web ADR 0029). */
	readonly labelId: string
}

/**
 * The series with distinct names: when two or more would read the same, each takes the id of the item it names, as
 * the lookup's twin form does (web ADR 0029). A label may itself carry one such form, so it repeats until all differ.
 */
function distinctNames<T extends { readonly name: string; readonly labelId: string }>(
	items: readonly T[],
): T[] {
	let named = [...items]
	for (let round = 0; round <= items.length; round += 1) {
		const counts = new Map<string, number>()
		for (const item of named) counts.set(item.name, (counts.get(item.name) ?? 0) + 1)
		const clashing = new Set(
			[...counts].filter(([, count]) => count > 1).map(([clashingName]) => clashingName),
		)
		if (clashing.size === 0) return named
		named = named.map((item) =>
			clashing.has(item.name) ? { ...item, name: `${item.name} (${item.labelId})` } : item,
		)
	}
	return named
}

/**
 * The cash-flow lines by Flow and by category, each as one series that follows its line from year to year. A series
 * is named through the shown plan's item names, so a labelled Flow reads its label (web ADR 0029).
 */
export function cashflowFigures(run: ProjectionRun, names: ItemNames = NO_ITEM_NAMES): Resolved[] {
	const ends = new Map(annualRowsOf(run).map((row) => [row.index, row.to]))
	const periods = periodsOf(run)
	const byKey = new Map<string, Collected>()
	const lines = run.tables.flatMap((table) => (table.name === "cashflow" ? table.rows : []))
	for (const line of lines) {
		const head = lineHeader(line, names)
		const end = ends.get(line.index)
		if (head === null || end === undefined) continue
		const found = byKey.get(head.id) ?? {
			...head,
			group: "money" as const,
			nominal: [],
			real: null,
			labelId: line.id ?? line.account ?? head.id,
		}
		found.nominal.push(pointAt(end, line.amount, periods.get(end) ?? null))
		byKey.set(head.id, found)
	}
	return distinctNames([...byKey.values()]).map((item) => ({
		id: item.id,
		name: item.name,
		group: item.group,
		nominal: item.nominal,
		real: item.real,
	}))
}

/** Each Account's value at the close of each year, nominal and real (`--accounts`). */
export function accountFigures(run: ProjectionRun, names: ItemNames = NO_ITEM_NAMES): Resolved[] {
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
		name: `Value of ${names.accounts.get(account) ?? account}`,
		group: "net-worth" as const,
		...points,
	}))
}
