import { BYTE_ORDER_MARK } from "./csv"

/** Where a quoted field's closing quote is: the first quote not doubled, or the end of the text. */
function closingQuote(body: string, from: number): number {
	let at = from
	for (let quote = body.indexOf('"', at); quote !== -1; quote = body.indexOf('"', at)) {
		if (body[quote + 1] !== '"') return quote
		at = quote + 2
	}
	return body.length
}

/** Where an unquoted field ends: at a comma or a line break, or at the end of the text. */
function unquotedEnd(body: string, from: number): number {
	let end = from
	while (end < body.length && !",\r\n".includes(body.charAt(end))) end++
	return end
}

/** One field starting at `at`, with its text unquoted, and where the next character is. */
function readField(body: string, at: number): { cell: string; next: number } {
	if (body.charAt(at) === '"') {
		const end = closingQuote(body, at + 1)
		return { cell: body.slice(at + 1, end).replaceAll('""', '"'), next: end + 1 }
	}
	const end = unquotedEnd(body, at)
	return { cell: body.slice(at, end), next: end }
}

/** Reads RFC 4180 text back into rows of cells: the inverse the round-trip tests check against. */
export function parseCsv(text: string): string[][] {
	const body = text.startsWith(BYTE_ORDER_MARK) ? text.slice(1) : text
	const rows: string[][] = []
	let row: string[] = []
	let at = 0
	while (at < body.length) {
		const field = readField(body, at)
		row.push(field.cell)
		at = field.next
		if (body.charAt(at) === ",") at += 1
		else {
			rows.push(row)
			row = []
			at += body.startsWith("\r\n", at) ? 2 : 1
		}
	}
	if (row.length > 0) rows.push(row)
	return rows
}
