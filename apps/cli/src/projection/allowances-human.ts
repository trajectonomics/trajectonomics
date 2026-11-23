import { type ColumnHint, isRecord, tableLines } from "../table/lines"
import { STOPPED_BY, type StoppedBy } from "./allowances-rows-view"

/*
 * `projection allowances`' human view (cli ADR-0061): one block per tax year, with what it owes now
 * and with every suggestion, then a row per label. The words for why a label stopped are the only
 * text added to the engine's figures, and the same sentence stands for a cap reached and for no
 * further saving, because the engine reports both as `noSaving`.
 */

/** The sentence for each way a label stops, in plain words. */
export const STOP_WORDS: Readonly<Record<StoppedBy, string>> = {
	noSaving: "no more is saved (the cap is reached or the tax stops falling)",
	belowMinSaving: "a step would save less than your limit",
	budget: "the budget is used",
}

const COLUMNS: readonly ColumnHint[] = [
	{ key: "label", label: "label" },
	{ key: "planned", label: "planned", align: "right" },
	{ key: "extra", label: "extra", align: "right" },
	{ key: "saving", label: "saving", align: "right" },
	{ key: "start", label: "start" },
	{ key: "target", label: "target" },
	{ key: "stoppedBy", label: "stopped because" },
]

function rowsOf(data: Record<string, unknown>, key: string): Record<string, unknown>[] {
	const rows = data[key]
	return Array.isArray(rows) ? rows.filter(isRecord) : []
}

/** The words for a stop reason, or the reason itself for one this build does not know. */
function stoppedText(value: unknown): string {
	return (STOPPED_BY as readonly unknown[]).includes(value)
		? STOP_WORDS[value as StoppedBy]
		: String(value)
}

/** One allowance row flattened for the table: the Flow's date and target stand beside the figures. */
function shownRow(row: Record<string, unknown>): Record<string, unknown> {
	const flow = isRecord(row["flow"]) ? row["flow"] : {}
	return {
		label: row["label"],
		planned: row["planned"],
		extra: row["extra"],
		saving: row["saving"],
		start: flow["start"] ?? "",
		target: flow["target"] ?? "",
		stoppedBy: stoppedText(row["stoppedBy"]),
	}
}

function yearBlock(
	year: Record<string, unknown>,
	rows: readonly Record<string, unknown>[],
): string {
	const mine = rows.filter((row) => row["levy"] === year["levy"] && row["from"] === year["from"])
	const heading = `tax year ${String(year["from"])} to ${String(year["to"])} (${String(year["levy"])}), settles ${String(year["settlementDate"])}`
	const sums = `tax due now ${String(year["dueBefore"])}, with every suggestion ${String(year["dueAfter"])}, saving ${String(year["saving"])}`
	const hints = mine.flatMap((row) =>
		typeof row["hint"] === "string" ? [`hint: ${row["hint"]}`] : [],
	)
	return [
		heading,
		sums,
		tableLines("allowances", mine.length, mine.map(shownRow), COLUMNS),
		...hints,
	].join("\n")
}

/** One block per tax year, printed after the body. A result with no whole year prints nothing here. */
export function allowanceBlocks(data: Record<string, unknown>): string[] {
	const rows = rowsOf(data, "allowances")
	return rowsOf(data, "taxYears").map((year) => yearBlock(year, rows))
}

/** The body the human form prints: the notes alone, since the years are blocks and the echo is JSON's. */
export function allowancesShown(data: Record<string, unknown>): Record<string, unknown> {
	return { notes: data["notes"] }
}
