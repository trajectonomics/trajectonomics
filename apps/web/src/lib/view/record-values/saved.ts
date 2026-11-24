import type { AccountValues } from "../../contract"
import type { ValueSheet } from "./types"

/** One recorded value as `traj` stated it: before, after and the difference, all as the CLI's strings. */
export interface SavedRow {
	readonly key: string
	readonly name: string
	readonly currency: string
	readonly before: string
	readonly value: string
	readonly difference: string
	/** A debt's row: its figures are what is owed, so its difference is a change in what you owe, not a gain or a loss. */
	readonly owed: boolean
	/** False when the value equalled the Balance, so nothing was written. */
	readonly written: boolean
	/** The CLI's notes, such as a later valuation this one moves. */
	readonly notes: readonly string[]
}

/** The result of a save, row by row in the order `traj` applied them, with the sentence that counts them. */
export interface SavedView {
	readonly rows: readonly SavedRow[]
	readonly summary: string
}

/** The save's result as the sheet shows it: each row's `before → value` and `difference` from the CLI. */
export function savedView(result: AccountValues, sheet: ValueSheet): SavedView {
	const rows = new Map(sheet.groups.flatMap((group) => group.rows).map((row) => [row.id, row]))
	const { added, unchanged } = result.counts
	const parts = [
		`${added} recorded`,
		...(unchanged > 0 ? [`${unchanged} already at that value, nothing written`] : []),
	]
	return {
		rows: result.values.map((row) => ({
			key: `${row.index}`,
			name: row.account.name,
			currency: rows.get(row.account.id)?.currency ?? "",
			owed: rows.get(row.account.id)?.owed ?? false,
			before: row.before,
			value: row.value,
			difference: row.difference,
			written: row.status === "added",
			notes: row.notes,
		})),
		summary: `${parts.join(", ")}.`,
	}
}
