import { AMOUNT_MAX_LENGTH, typedAmount } from "./amount"
import { type DateRead, readDate } from "./date"
import type { ImportEntry, ImportProblem, ImportSource } from "./types"

/** The spreadsheet letter of a zero-based column: A, B, ... Z, AA. */
export function letterOf(index: number): string {
	let name = ""
	for (let at = index; at >= 0; at = Math.floor(at / 26) - 1) {
		name = String.fromCharCode(65 + (at % 26)) + name
	}
	return name
}

/** A column's name as the table shows it: its header text, or its letter when the header is empty. */
export function columnName(header: readonly string[], index: number): string {
	const text = header[index]?.trim() ?? ""
	return text === "" ? letterOf(index) : text
}

/** Gathers the values and the problems of one table while a layout reads it. */
export class Collector {
	readonly entries: ImportEntry[] = []
	readonly problems: ImportProblem[] = []
	private readonly declared = new Map<string, string>()

	/** Names an account of the table, so one with no value still shows in the match. */
	declare(key: string, label: string): void {
		if (!this.declared.has(key)) this.declared.set(key, label)
	}

	problem(row: number, column: string | null, message: string): void {
		this.problems.push({ row, column, message })
	}

	/** Reads a date cell; a cell that is not a date is a problem at its place. */
	date(cell: string, row: number, column: string): Extract<DateRead, { ok: true }> | null {
		const read = readDate(cell)
		if (read.ok) return read
		this.problem(row, column, read.message)
		return null
	}

	/** Adds one value as typed. An empty cell is no value; an amount too long for `traj` is a problem. */
	add(
		source: string,
		when: Extract<DateRead, { ok: true }>,
		cell: string,
		row: number,
		column: string,
	): void {
		const value = typedAmount(cell)
		if (value === "") return
		if (value.length > AMOUNT_MAX_LENGTH) {
			this.problem(row, column, `“${value.slice(0, 12)}…” is too long to be an amount.`)
			return
		}
		this.entries.push({
			source,
			label: this.declared.get(source) ?? source,
			date: when.date,
			value,
			converted: when.converted,
			row,
			column,
		})
	}

	/** The accounts in the order the table names them, each with how many values it holds and its date range. */
	sources(entries: readonly ImportEntry[]): ImportSource[] {
		const found = new Map<string, ImportSource>()
		for (const [key, label] of this.declared) {
			found.set(key, { key, label, count: 0, first: null, last: null })
		}
		for (const entry of entries) {
			const was = found.get(entry.source)
			if (was === undefined) continue
			found.set(entry.source, {
				...was,
				count: was.count + 1,
				first: was.first === null || entry.date < was.first ? entry.date : was.first,
				last: was.last === null || entry.date > was.last ? entry.date : was.last,
			})
		}
		return [...found.values()]
	}
}
