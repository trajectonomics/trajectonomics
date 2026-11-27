import type { ColumnHint, RenderHint } from "../table"
import { milestoneBlocks } from "./chance-milestones-human"
import { OUTCOME_EXTRA, outcomesShown } from "./chance-outcomes-human"
import { SUCCESS_NOTE_PREFIX } from "./chance-view"

/** The columns of the two spending tables in the human form, headed as their row keys are spelled. */
const SPENDING_COLUMNS: Record<"spendingBands" | "lowestYearSpending", ColumnHint[]> = {
	spendingBands: [
		{ key: "index", label: "index", align: "right" },
		{ key: "to", label: "to" },
		{ key: "p10", label: "p10", align: "right" },
		{ key: "p50", label: "p50", align: "right" },
		{ key: "p90", label: "p90", align: "right" },
	],
	lowestYearSpending: [
		{ key: "paths", label: "paths", align: "right" },
		{ key: "p10", label: "p10", align: "right" },
		{ key: "p25", label: "p25", align: "right" },
		{ key: "p50", label: "p50", align: "right" },
		{ key: "p75", label: "p75", align: "right" },
		{ key: "p90", label: "p90", align: "right" },
	],
}

/** The human form: the Bands table, then the notes that state the success share and definition. */
const column = (key: string, align?: "right") =>
	align === undefined ? { key, label: key } : { key, label: key, align }

/** The field `shown` adds: the sentence stating the success share, which the human form reads first. */
const HEADLINE = "headline"

/**
 * The human form of the result: the success share moves from the notes to the top, so a person reads the
 * answer before the Bands that back it, and `--outcomes` is laid out as before. The JSON keeps its notes.
 */
function shown(data: Record<string, unknown>): Record<string, unknown> {
	const laid = outcomesShown(data)
	const notes = laid["notes"]
	if (!Array.isArray(notes)) return laid
	const headline = notes.filter((n) => typeof n === "string" && n.startsWith(SUCCESS_NOTE_PREFIX))
	return {
		...laid,
		[HEADLINE]: headline,
		notes: notes.filter((n) => !headline.includes(n)),
	}
}

export const chanceHint: RenderHint = {
	lead: HEADLINE,
	tables: "tables",
	rows: "rows",
	columns: {
		bands: [
			column("index", "right"),
			column("to"),
			column("p10", "right"),
			column("p50", "right"),
			column("p90", "right"),
		],
		...SPENDING_COLUMNS,
	},
	// With --outcomes: the paths `representative` names, then every path's outcome, worst first (cli ADR-0069).
	extra: OUTCOME_EXTRA,
	blocks: milestoneBlocks,
	display: shown,
	note: "notes",
}
