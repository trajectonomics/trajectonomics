import type { ColumnHint, ExtraTable } from "../table"

/*
 * `projection chance --outcomes`' human view (cli ADR-0027, ADR-0069): every path's outcome, worst
 * closing net worth first, then the paths `representative` names. Only the human Format reads it;
 * the JSON keeps the outcomes in path order, which is the order `--index` counts in.
 */

/** The field `display` adds: the outcomes flattened into rows, sorted. */
const OUTCOME_ROWS = "outcomeRows"

/** The field `display` adds: `representative` as one row per pick. */
const REPRESENTATIVE_ROWS = "representativeRows"

const column = (key: string, align?: ColumnHint["align"]): ColumnHint =>
	align === undefined ? { key, label: key } : { key, label: key, align }

/** The two tables the human form adds after the Bands. */
export const OUTCOME_EXTRA: readonly ExtraTable[] = [
	{
		field: REPRESENTATIVE_ROWS,
		name: "representative",
		columns: [column("which"), column("index", "right"), column("closingNetWorth", "right")],
	},
	{
		field: OUTCOME_ROWS,
		name: "outcomes",
		columns: [
			column("index", "right"),
			column("closingNetWorth", "right"),
			column("lowestNetWorth", "right"),
			column("lowestYear"),
			column("runsOut"),
			column("unmet", "right"),
		],
	},
]

type Row = Record<string, unknown>

const isRow = (value: unknown): value is Row => typeof value === "object" && value !== null

/**
 * A money string at the currency's own scale as a number that orders as the money does: its digits
 * with the sign, no decimal point. Every figure of one result has the same scale, so this orders them
 * and computes nothing.
 */
function scaled(money: unknown): bigint {
	return BigInt(String(money).replace(".", ""))
}

/** Closing net worth ascending, the lower index first on a tie. */
function byClosing(left: Row, right: Row): number {
	const a = scaled(left["closingNetWorth"])
	const b = scaled(right["closingNetWorth"])
	if (a !== b) return a < b ? -1 : 1
	return Number(left["index"]) - Number(right["index"])
}

/** The outcome as one flat table row, the run-out's date and unmet shortfall in their own columns. */
function flat(outcome: Row): Row {
	const runsOut = isRow(outcome["runsOut"]) ? outcome["runsOut"] : undefined
	return {
		index: outcome["index"],
		closingNetWorth: outcome["closingNetWorth"],
		lowestNetWorth: outcome["lowestNetWorth"],
		lowestYear: outcome["lowestYear"],
		runsOut: runsOut?.["date"] ?? "",
		unmet: runsOut?.["unmet"] ?? "",
	}
}

const PICKS: readonly [string, string][] = [
	["p10", "10th Percentile"],
	["p50", "50th Percentile"],
	["p90", "90th Percentile"],
	["earliestRunsOut", "earliest runs out"],
	["lowest", "lowest net worth"],
]

/** The result with `--outcomes` laid out for a person: sorted rows, and the paths `representative` names. */
export function outcomesShown(data: Row): Row {
	const outcomes = data["outcomes"]
	const picks = data["representative"]
	if (!Array.isArray(outcomes) || !isRow(picks)) return data
	const rows = outcomes.filter(isRow)
	const byIndex = new Map(rows.map((row) => [Number(row["index"]), row]))
	const representative = PICKS.flatMap(([key, which]) => {
		const index = picks[key]
		const outcome = typeof index === "number" ? byIndex.get(index) : undefined
		return outcome === undefined
			? []
			: [{ which, index, closingNetWorth: outcome["closingNetWorth"] }]
	})
	return {
		...data,
		[REPRESENTATIVE_ROWS]: representative,
		[OUTCOME_ROWS]: rows.map(flat).sort(byClosing),
	}
}
