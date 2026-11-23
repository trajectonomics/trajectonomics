import type { ProjectionRun, Snapshot } from "../../contract"
import type { WhatIf } from "../../what-if/session"
import { tableCsv } from "./csv"
import type { ReportSource, ReportTarget } from "./source"
import type { ReportTable } from "./table"

/** One file a download writes: its name, its media type and its text. */
export interface ReportFile {
	readonly name: string
	readonly type: string
	readonly text: string
}

export const CSV_TYPE = "text/csv;charset=utf-8"
export const JSON_TYPE = "application/json;charset=utf-8"

/** The changes of a What-if session on a plan: the Sets and Removals that produced the session's figures. */
export interface SessionChanges {
	readonly sets: WhatIf["sets"]
	readonly removals: WhatIf["removals"]
}

/** A plan name made safe for a file name: path separators and control characters become a dash. */
export function safeName(plan: string): string {
	const cleaned = [...plan]
		.map((char) => (/[\\/:*?"<>|]/.test(char) || char.charCodeAt(0) < 32 ? "-" : char))
		.join("")
		.trim()
	return cleaned === "" ? "plan" : cleaned
}

/** `<plan>-<part>-<as-of>.<extension>`, with `-what-if` before the extension when the figures are the session's. */
export function reportFileName(
	source: ReportTarget,
	part: string,
	extension: "csv" | "json",
): string {
	const suffix = source.whatIf ? "-what-if" : ""
	return `${safeName(source.plan)}-${part}-${source.asOf}${suffix}.${extension}`
}

/** JSON text as the page writes it: two-space indentation and a final newline. */
export function jsonText(value: unknown): string {
	return `${JSON.stringify(value, null, 2)}\n`
}

/** The CSV of a table, with its hidden columns left out. */
export function tableFile(
	source: ReportSource,
	table: ReportTable,
	hidden: readonly string[],
): ReportFile {
	return {
		name: reportFileName(source, table.name, "csv"),
		type: CSV_TYPE,
		text: tableCsv(table, hidden),
	}
}

/** The `traj --json` result the table came from: the whole projection run, as the Snapshot holds it. */
export function runFile(source: ReportSource): ReportFile {
	return {
		name: reportFileName(source, "projection", "json"),
		type: JSON_TYPE,
		text: jsonText(source.run),
	}
}

/** Only the Snapshot's entries that belong to the plan, each Read as the Snapshot holds it. */
function entriesOf<T>(
	record: Readonly<Record<string, T>>,
	plan: string,
): Record<string, T> | undefined {
	return Object.hasOwn(record, plan) ? { [plan]: record[plan] as T } : undefined
}

/**
 * The selected plan's results in one JSON file: the Snapshot's entries for the plan, unchanged. In a What-if
 * session the file also says which changes produced the session's projection.
 */
export function everythingFile(
	reads: Pick<Snapshot["reads"], "projections" | "fi" | "documents" | "chance">,
	source: ReportTarget & { readonly run?: ProjectionRun | undefined },
	changes: SessionChanges | null,
): ReportFile {
	const { plan } = source
	const session =
		source.whatIf && changes !== null && source.run !== undefined
			? { plan, ...changes, projection: source.run }
			: undefined
	const value = {
		projections: entriesOf(reads.projections, plan),
		fi: entriesOf(reads.fi, plan),
		documents: entriesOf(reads.documents, plan),
		chance: entriesOf(reads.chance, plan),
		whatIf: session,
	}
	return { name: reportFileName(source, "all", "json"), type: JSON_TYPE, text: jsonText(value) }
}
