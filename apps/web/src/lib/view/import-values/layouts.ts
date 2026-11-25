import { type Collector, columnName } from "./collector"
import type { DateRead } from "./date"
import { readDate } from "./date"
import type { TableRow } from "./delimited"
import { perValue } from "./per-value"
import type { Layout } from "./types"

type DateOf = Extract<DateRead, { ok: true }>

/** Dates down the first column, one account per column. */
function datesDown(header: TableRow, body: readonly TableRow[], out: Collector): void {
	if (readDate(header.cells[0] ?? "").ok) {
		out.problem(
			header.row,
			null,
			"The first row must name the accounts, and it starts with a date. Add a header row.",
		)
	}
	const names = header.cells.slice(1)
	names.forEach((name, at) => {
		if (name !== "") out.declare(`${at}:${name}`, name)
	})
	for (const line of body) {
		const values = line.cells.slice(1)
		if (values.every((cell) => cell === "")) continue
		const when = out.date(line.cells[0] ?? "", line.row, columnName(header.cells, 0))
		if (when === null) continue
		values.forEach((cell, at) => {
			const name = names[at] ?? ""
			if (cell === "") return
			if (name === "")
				out.problem(
					line.row,
					columnName(header.cells, at + 1),
					"This value has no account name above it.",
				)
			else out.add(`${at}:${name}`, when, cell, line.row, name)
		})
	}
}

/** One value of an accounts-down row: it needs the date its column's header states. */
function valueUnder(
	header: TableRow,
	at: number,
	dates: readonly (DateOf | null)[],
	name: string,
	line: TableRow,
	out: Collector,
): void {
	const cell = line.cells[at + 1] ?? ""
	const when = dates[at]
	const column = columnName(header.cells, at + 1)
	if (cell === "") return
	if (when) out.add(name, when, cell, line.row, column)
	else if (header.cells[at + 1] === "")
		out.problem(line.row, column, "This value has no date above it.")
}

/** Accounts down the first column, one date per column. */
function accountsDown(header: TableRow, body: readonly TableRow[], out: Collector): void {
	const dates = header.cells.slice(1).map((cell, at) => {
		return cell === "" ? null : out.date(cell, header.row, columnName(header.cells, at + 1))
	})
	for (const line of body) {
		const name = line.cells[0] ?? ""
		const values = line.cells.slice(1)
		if (name === "") {
			if (values.some((cell) => cell !== ""))
				out.problem(
					line.row,
					columnName(header.cells, 0),
					"This row has values and no account name.",
				)
			continue
		}
		out.declare(name, name)
		for (let at = 0; at < values.length; at++) valueUnder(header, at, dates, name, line, out)
	}
}

/** The reader of each layout. */
export const LAYOUTS: Record<
	Layout,
	(header: TableRow, body: readonly TableRow[], out: Collector) => void
> = {
	"dates-down": datesDown,
	"accounts-down": accountsDown,
	"per-value": perValue,
}
