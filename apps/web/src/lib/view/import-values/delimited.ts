/** One non-blank row of the pasted text: its place in the table (the header row is 1) and its cells, trimmed. */
export interface TableRow {
	readonly row: number
	readonly cells: readonly string[]
}

/** The rows of the pasted text, and where a quote was never closed. */
export interface Table {
	readonly rows: readonly TableRow[]
	readonly unclosed: number | null
}

const QUOTE = '"'

/** The delimiter of the first non-blank line: a tab when it holds one outside quotes (a paste from a spreadsheet), else a comma. */
function delimiterOf(text: string): "\t" | "," {
	const line = text.split("\n").find((each) => each.trim() !== "") ?? ""
	return line.replace(/"[^"]*"/g, "").includes("\t") ? "\t" : ","
}

/** The reading state of `splitTable`: the row and cell being built, and whether a quote is open. */
interface Reading {
	rows: TableRow[]
	cells: string[]
	field: string
	quoted: boolean
	row: number
	opened: number
}

function endField(at: Reading): void {
	at.cells.push(at.field.trim())
	at.field = ""
}

/** Ends the row: it is kept unless it is blank, but its number is used either way. */
function endRow(at: Reading): void {
	endField(at)
	if (at.cells.some((cell) => cell !== "")) at.rows.push({ row: at.row, cells: at.cells })
	at.cells = []
	at.row++
	at.opened = at.row
}

/** Reads a character inside quotes; returns how many characters it used (a doubled quote is two). */
function readQuoted(at: Reading, text: string, index: number): number {
	if (text[index] !== QUOTE) at.field += text[index]
	else if (text[index + 1] === QUOTE) {
		at.field += QUOTE
		return 2
	} else at.quoted = false
	return 1
}

/** Reads the character at `index`; returns how many characters it used. */
function read(at: Reading, text: string, index: number, delimiter: string): number {
	const char = text[index] ?? ""
	if (at.quoted) return readQuoted(at, text, index)
	if (char === QUOTE && at.field === "") at.quoted = true
	else if (char === delimiter) endField(at)
	else if (char === "\n") endRow(at)
	else if (char !== "\r") at.field += char
	return 1
}

/**
 * Splits tab- or comma-separated text into rows of cells. A cell may be quoted, and then may hold the
 * delimiter, a line break or a doubled quote. Blank lines are skipped but still count, so a row's number
 * is the row of the spreadsheet it came from. No cell is read as a number or a date here.
 */
export function splitTable(source: string): Table {
	const text = source.replace(/^﻿/, "")
	const delimiter = delimiterOf(text)
	const at: Reading = { rows: [], cells: [], field: "", quoted: false, row: 1, opened: 1 }
	for (let index = 0; index < text.length; index += read(at, text, index, delimiter)) {
		// each step reads one character, or a doubled quote
	}
	const unclosed = at.quoted ? at.opened : null
	if (at.field !== "" || at.cells.length > 0) endRow(at)
	return { rows: at.rows, unclosed }
}
