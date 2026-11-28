import type { ColumnHint, RenderHint } from "../table"
import { tableLines } from "../table/lines"
import { projectionHint } from "./render"

function entryOf(entry: unknown): Record<string, unknown> {
	return typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : {}
}

/** One roll-up as a row per Account; a model with none keeps a row when it states the inflation. */
function rowsOfRollup(rollup: unknown): Record<string, unknown>[] {
	if (typeof rollup !== "object" || rollup === null) return []
	const { index, from, to, inflationBps, accounts } = rollup as Record<string, unknown>
	if (!Array.isArray(accounts)) return []
	const shared = { index, from, to, ...(typeof inflationBps === "number" ? { inflationBps } : {}) }
	if (accounts.length === 0) return typeof inflationBps === "number" ? [shared] : []
	return accounts.map((entry) => ({ ...shared, ...entryOf(entry) }))
}

/** The returns of each roll-up as one row per roll-up and Account, for the human form. */
function returnRows(data: Record<string, unknown>): Record<string, unknown>[] {
	const returns = data["returns"]
	return Array.isArray(returns) ? returns.flatMap(rowsOfRollup) : []
}

const COLUMNS: readonly ColumnHint[] = [
	{ key: "index", label: "index", align: "right" },
	{ key: "from", label: "from" },
	{ key: "to", label: "to" },
	{ key: "inflationBps", label: "Inflation", align: "right", optional: true },
	{ key: "account", label: "account" },
	{ key: "returnBps", label: "returnBps", align: "right" },
]

/**
 * `projection path`'s human view: `projection run`'s, then each Account's return over each roll-up as
 * a table of its own (cli ADR-0069). The JSON keeps `returns` nested per roll-up.
 */
export const pathHint: RenderHint = {
	...projectionHint,
	blocks: (data) => {
		const rows = returnRows(data)
		return [
			...(projectionHint.blocks?.(data) ?? []),
			...(rows.length === 0 ? [] : [tableLines("returns", rows.length, rows, COLUMNS)]),
		]
	},
}
