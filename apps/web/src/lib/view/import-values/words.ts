import { formatDate } from "../../format"
import type { RefusedValue } from "./refusals"
import type { ImportProblem, ImportSource, Place } from "./types"

/** How many problems or refused values a list shows before it says how many more there are. */
export const LIST_LIMIT = 20

/** "row 5, column Bank", or "row 5" when the problem is the row's. */
export function placeLine(place: Place): string {
	return place.column === null ? `Row ${place.row}` : `Row ${place.row}, column ${place.column}`
}

/** "12 values, 31 Jan 2026 to 31 Dec 2026", or what a column with none says. */
export function sourceLine(source: ImportSource): string {
	if (source.first === null || source.last === null) return "No values"
	const count = source.count === 1 ? "1 value" : `${source.count} values`
	return source.first === source.last
		? `${count}, ${formatDate(source.first)}`
		: `${count}, ${formatDate(source.first)} to ${formatDate(source.last)}`
}

/** The review's first line: how many values will be recorded, and over what dates. */
export function planLine(count: number, earliest: string | null, latest: string | null): string {
	if (earliest === null || latest === null) return "There are no values to record."
	const values = count === 1 ? "1 value" : `${count} values`
	return earliest === latest
		? `${values} on ${formatDate(earliest)}`
		: `${values}, from ${formatDate(earliest)} to ${formatDate(latest)}`
}

/** The problems a list shows, and how many it leaves out. */
export function limited<T>(items: readonly T[]): { shown: readonly T[]; more: number } {
	return { shown: items.slice(0, LIST_LIMIT), more: Math.max(0, items.length - LIST_LIMIT) }
}

/** The line under the table when something must be fixed first. */
export function problemsLine(problems: readonly ImportProblem[]): string {
	return problems.length === 1
		? "1 row to fix before you can go on."
		: `${problems.length} rows to fix before you can go on.`
}

/** The result of a preview in one sentence, from the CLI's own counts. */
export function previewLine(added: number, unchanged: number): string {
	const recorded = added === 1 ? "1 value would be recorded" : `${added} values would be recorded`
	return unchanged === 0
		? `${recorded}. Nothing is written until you import.`
		: `${recorded}, and ${unchanged} already at that value would write nothing. Nothing is written until you import.`
}

/** One line of a list of things to fix: where it is, and what is wrong. */
export interface ListedItem {
	readonly key: string
	readonly place: string
	readonly message: string
}

/** The problems of the pasted text as list lines, the first few of them, and how many more there are. */
export function problemItems(problems: readonly ImportProblem[]): {
	shown: ListedItem[]
	more: number
} {
	const { shown, more } = limited(problems)
	return {
		shown: shown.map((problem, at) => ({
			key: `${at}`,
			place: placeLine(problem),
			message: problem.message,
		})),
		more,
	}
}

/** The values `traj` refused as list lines: the row and column in the table, the account and date, and its reason. */
export function refusedItems(values: readonly RefusedValue[]): {
	shown: ListedItem[]
	more: number
} {
	const { shown, more } = limited(values)
	return {
		shown: shown.map((value, at) => ({
			key: `${at}`,
			place: placeLine(value),
			message: `${value.account}, ${formatDate(value.date)}: ${value.message}`,
		})),
		more,
	}
}

/** What was recorded, from the CLI's own counts, and the dates it covers. */
export function doneLine(
	added: number,
	unchanged: number,
	earliest: string | null,
	latest: string | null,
): string {
	const range =
		earliest !== null && latest !== null
			? ` from ${formatDate(earliest)} to ${formatDate(latest)}`
			: ""
	const recorded = `${added} recorded${range}`
	return unchanged === 0
		? `${recorded}.`
		: `${recorded}, and ${unchanged} already at that value, nothing written.`
}
