import type { PersonAge, ProjectionRun } from "../../contract"
import type { ReportTable } from "./table"

/** One way of reading a field of a record: its name, whether it is a figure, and the value it holds. */
export interface Spec<Row> {
	readonly key: string
	readonly numeric: boolean
	readonly value: (row: Row) => unknown
}

/** The rows of one projection table, by the CLI's table name. */
export type Rows<N extends ProjectionRun["tables"][number]["name"]> = Extract<
	ProjectionRun["tables"][number],
	{ name: N }
>["rows"]

/** A text field, such as a date, a name or a flag. */
export function text<Row>(key: string, value: (row: Row) => unknown): Spec<Row> {
	return { key, numeric: false, value }
}

/** A figure field: a decimal string, an integer, or a count, aligned to the right on the page. */
export function figure<Row>(key: string, value: (row: Row) => unknown): Spec<Row> {
	return { key, numeric: true, value }
}

/** The text a field holds, exactly as the Snapshot stated it. Numbers are integers; nothing is rounded. */
export function cellText(value: unknown): string {
	if (typeof value === "string") return value
	if (typeof value === "number" || typeof value === "boolean") return String(value)
	return ""
}

/** One field per household person, named `ages.<person>`, in the order the people first appear. */
export function ageSpecs<Row extends { readonly ages: readonly PersonAge[] }>(
	rows: readonly Row[],
): Spec<Row>[] {
	const people = [...new Set(rows.flatMap((row) => row.ages.map((age) => age.person)))]
	return people.map((person) =>
		figure(`ages.${person}`, (row: Row) => row.ages.find((age) => age.person === person)?.age),
	)
}

/** A field some rows carry and others do not: it is a column only when at least one row has it. */
export function optional<Row>(rows: readonly Row[], spec: Spec<Row>): Spec<Row>[] {
	return rows.some((row) => spec.value(row) !== undefined) ? [spec] : []
}

/** The table made of rows read through the fields: each record holds every field's text. */
export function build<Row>(
	name: string,
	label: string,
	specs: readonly Spec<Row>[],
	rows: readonly Row[],
): ReportTable {
	return {
		name,
		label,
		columns: specs.map(({ key, numeric }) => ({ key, numeric })),
		records: rows.map((row) =>
			Object.fromEntries(specs.map((spec) => [spec.key, cellText(spec.value(row))])),
		),
	}
}
