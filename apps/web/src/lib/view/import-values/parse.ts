import { Collector } from "./collector"
import { splitTable } from "./delimited"
import { LAYOUTS } from "./layouts"
import type { Layout, ParsedImport } from "./types"

/** The most characters of pasted text the page reads: a long ledger fits in a fraction of it. */
export const IMPORT_MAX_CHARS = 1_000_000

const NOTHING: ParsedImport = { entries: [], sources: [], problems: [], notes: [] }

/** What the Buddhist-era conversion changed, in a sentence, or none. */
function conversionNote(count: number): string[] {
	if (count === 0) return []
	const dates = count === 1 ? "1 date" : `${count} dates`
	return [
		`${dates} used a Buddhist-era year (2560 to 2600) and ${count === 1 ? "was" : "were"} converted: the year minus 543, as 2569 is 2026. Nothing is written in that era.`,
	]
}

/**
 * Reads pasted or loaded text in one layout. Pure and total: it returns the values in date order, the accounts
 * with what each holds, and every row to fix; it never throws and converts no amount. A header row is required.
 */
export function parseImport(text: string, layout: Layout): ParsedImport {
	if (text.trim() === "") return NOTHING
	if (text.length > IMPORT_MAX_CHARS) {
		const message =
			"This is too much text. Import a smaller range of dates, or fewer accounts, at a time."
		return { ...NOTHING, problems: [{ row: 1, column: null, message }] }
	}
	const table = splitTable(text)
	const [header, ...body] = table.rows
	const out = new Collector()
	if (header === undefined) return NOTHING
	LAYOUTS[layout](header, body, out)
	if (table.unclosed !== null)
		out.problem(table.unclosed, null, "A quote opened here is never closed.")
	const entries = out.entries
		.map((entry, at) => ({ entry, at }))
		.sort((a, b) =>
			a.entry.date < b.entry.date ? -1 : a.entry.date > b.entry.date ? 1 : a.at - b.at,
		)
		.map(({ entry }) => entry)
	const problems = [...out.problems].sort((a, b) => a.row - b.row)
	const notes = conversionNote(entries.filter((entry) => entry.converted).length)
	return { entries, sources: out.sources(entries), problems, notes }
}
