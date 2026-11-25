import { type ColumnHint, isRecord, tableLines } from "./lines"

export type { ColumnHint } from "./lines"

/** Columns whose values read best right-aligned: ids' counts and amounts. */
export const RIGHT_ALIGNED: ReadonlySet<string> = new Set(["version", "ordinal", "amount"])

/**
 * How a table-shaped Result renders in the human Format. It is a hint, not a second result
 * shape: the output schema stays the contract, and JSON ignores it.
 */
export type RenderHint = {
	/** The result field holding the table entries, each with a `name` and a `count`. */
	tables?: string
	/** The entry field holding one table's rows. */
	rows?: string
	/** One table's columns, keyed by the entry's `name`. */
	columns?: Readonly<Record<string, readonly ColumnHint[]>>
	/**
	 * A result field holding plain sentences, printed before the tables, one per line: the answer a
	 * person came for, which the table then backs. A field that is absent or empty prints nothing.
	 */
	lead?: string
	/**
	 * A result field holding plain sentences, printed after the tables, one per line. It is for a
	 * fact a person must read (such as a status only the JSON would otherwise show), never a
	 * layout choice.
	 */
	note?: string
	/**
	 * Further row fields to render as their own table after `tables`, so a result keeps one shape
	 * in JSON while a person reads every row. A field that is absent or empty renders nothing.
	 */
	extra?: readonly ExtraTable[]
	/**
	 * A presentation of the result for the human Format only: the result the body is printed from.
	 * It may state a value the JSON keeps as null, such as the date a Milestone was not reached by,
	 * and it never changes a value the output schema states as something else.
	 */
	display?: (data: Record<string, unknown>) => Record<string, unknown>
	/** Human-only blocks printed after the body, from the result as the command returned it. */
	blocks?: (data: Record<string, unknown>) => string[]
}

/** One further row field a hint renders as a table of its own. */
export type ExtraTable = {
	/** The result field holding the rows. */
	field: string
	/** The block's heading, printed with its row count. */
	name: string
	columns: readonly ColumnHint[]
}

/**
 * The table view a hint asks for, or null when the result does not fit it: a bare summary has
 * no rows, so it falls back to the generic renderer.
 */
export function renderTableResult(data: unknown, hint: RenderHint): string | null {
	if (!isRecord(data)) return null
	const { tables, rows, columns } = hint
	if (tables === undefined || rows === undefined || columns === undefined) return null
	const entries = data[tables]
	const blocks =
		Array.isArray(entries) && entries.length > 0 ? blocksOf(entries, rows, columns) : null
	if (blocks === null) return null
	const notes = noteLines(data, hint)
	const lead = linesOf(data, hint.lead)
	const body = [
		...(lead.length === 0 ? [] : [lead.join("\n")]),
		...blocks,
		...extraBlocks(data, hint),
	].join("\n\n")
	return notes.length === 0 ? body : `${body}\n\n${notes.join("\n")}`
}

/** One block per table entry, or null when any entry is not a table its columns describe. */
function blocksOf(
	entries: readonly unknown[],
	rows: string,
	columns: Readonly<Record<string, readonly ColumnHint[]>>,
): string[] | null {
	const blocks: string[] = []
	for (const entry of entries) {
		const block = isRecord(entry) ? blockOf(entry, rows, columns) : null
		if (block === null) return null
		blocks.push(block)
	}
	return blocks
}

/** The tables a hint asks for beyond its main one; an absent or empty field renders nothing. */
function extraBlocks(data: Record<string, unknown>, hint: RenderHint): string[] {
	const blocks: string[] = []
	for (const extra of hint.extra ?? []) {
		const rows = data[extra.field]
		if (!Array.isArray(rows) || rows.length === 0) continue
		blocks.push(tableLines(extra.name, rows.length, rows, extra.columns))
	}
	return blocks
}

/** The hint's note field, one sentence per line; a result without one prints nothing extra. */
function noteLines(data: Record<string, unknown>, hint: RenderHint): string[] {
	return linesOf(data, hint.note)
}

/** The sentences a result field holds, one per line; a missing or non-list field holds none. */
function linesOf(data: Record<string, unknown>, field: string | undefined): string[] {
	if (field === undefined) return []
	const lines = data[field]
	if (!Array.isArray(lines)) return []
	return lines.filter((line): line is string => typeof line === "string")
}

function blockOf(
	entry: Record<string, unknown>,
	rowsKey: string,
	columns: Readonly<Record<string, readonly ColumnHint[]>>,
): string | null {
	const name = entry["name"]
	const count = entry["count"]
	const rows = entry[rowsKey]
	const cols = typeof name === "string" ? columns[name] : undefined
	if (typeof name !== "string" || typeof count !== "number") return null
	if (!Array.isArray(rows) || cols === undefined) return null
	return tableLines(name, count, rows, cols)
}
