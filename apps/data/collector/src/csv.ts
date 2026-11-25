const CELL = /("(?:[^"]|"")*"|[^,\r\n]*)(,|\r?\n|$)/g

function cellValue(match: RegExpExecArray): string {
	const raw = match[1] ?? ""
	if (!raw.startsWith('"')) return raw
	return raw.slice(1, -1).replace(/""/g, '"')
}

/** Parses RFC 4180 CSV into rows, handling quotes, escaped quotes and embedded newlines. */
export function parseCsv(text: string): string[][] {
	const rows: string[][] = []
	let row: string[] = []
	for (const match of text.matchAll(CELL)) {
		if (match[0].length === 0) break
		row.push(cellValue(match))
		if (match[2] !== ",") {
			rows.push(row)
			row = []
		}
	}
	if (row.length > 0) rows.push(row)
	return rows
}
