import type { ColumnHint, RenderHint } from "../table"
import { tableLines } from "../table/lines"
import { projectionHint } from "./render"

/** The returns of each roll-up as one row per roll-up and Account, for the human form. */
function returnRows(data: Record<string, unknown>): Record<string, unknown>[] {
	const returns = data["returns"]
	if (!Array.isArray(returns)) return []
	return returns.flatMap((rollup: unknown) => {
		if (typeof rollup !== "object" || rollup === null) return []
		const { index, from, to, accounts } = rollup as Record<string, unknown>
		if (!Array.isArray(accounts)) return []
		return accounts.map((entry: unknown) => ({
			index,
			from,
			to,
			...(typeof entry === "object" && entry !== null ? entry : {}),
		}))
	})
}

const COLUMNS: readonly ColumnHint[] = [
	{ key: "index", label: "index", align: "right" },
	{ key: "from", label: "from" },
	{ key: "to", label: "to" },
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
