import { type Collector, columnName } from "./collector"
import type { TableRow } from "./delimited"

const COLUMN_WORDS = {
	date: ["date"],
	account: ["account"],
	value: ["value", "amount", "balance"],
} as const

/** The columns of the one-row-per-value layout: found by their header words, else the first three in order. */
export function perValueColumns(header: TableRow): {
	date: number
	account: number
	value: number
} {
	const lower = header.cells.map((cell) => cell.toLowerCase())
	const find = (words: readonly string[]) => lower.findIndex((cell) => words.includes(cell))
	const named = {
		date: find(COLUMN_WORDS.date),
		account: find(COLUMN_WORDS.account),
		value: find(COLUMN_WORDS.value),
	}
	return Object.values(named).every((at) => at !== -1) ? named : { date: 0, account: 1, value: 2 }
}

type Columns = { date: number; account: number; value: number }

/** One row of the one-row-per-value layout: a date, an account and an amount. */
function valueRow(header: TableRow, line: TableRow, at: Columns, out: Collector): void {
	const cell = line.cells[at.value] ?? ""
	if (cell === "") return
	const name = line.cells[at.account] ?? ""
	const when = out.date(line.cells[at.date] ?? "", line.row, columnName(header.cells, at.date))
	if (name === "") {
		out.problem(line.row, columnName(header.cells, at.account), "This value has no account name.")
		return
	}
	out.declare(name, name)
	if (when !== null) out.add(name, when, cell, line.row, columnName(header.cells, at.value))
}

/** One row per value: a date, an account and an amount. */
export function perValue(header: TableRow, body: readonly TableRow[], out: Collector): void {
	if (header.cells.length < 3) {
		out.problem(header.row, null, "The first row must name three columns: date, account and value.")
		return
	}
	const at = perValueColumns(header)
	for (const line of body) valueRow(header, line, at, out)
}
