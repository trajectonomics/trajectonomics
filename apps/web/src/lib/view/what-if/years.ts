import type { ProjectionCompare } from "../../contract"
import { formatDate } from "../../format"
import { moneyCell, textCell } from "../compare/cell"
import { moneyChange } from "./change"
import type { Triple } from "./triple"

type AnnualRow = ProjectionCompare["tables"][number]["rows"][number]

/** The figures of one year, named as the compare's annual row names them, with the words of each change. */
const FIGURES = [
	{ key: "closingNetWorth", label: "Closing net worth", words: ["higher", "lower"] },
	{ key: "income", label: "Income", words: ["more", "less"] },
	{ key: "expense", label: "Expense", words: ["more", "less"] },
	{ key: "contributions", label: "Contributions", words: ["more", "less"] },
	{ key: "interest", label: "Interest", words: ["more", "less"] },
	{ key: "levy", label: "Levy", words: ["more", "less"] },
] as const

/** The figure keys a page may ask for. */
export type YearFigure = (typeof FIGURES)[number]["key"]

/** The reason a year has no change: the two sides' periods differ, or one side has no such year. */
const YEAR_REASON = "The two Projections do not cover the same period this year"

/** One year of the what-if: its period and the triples of the figures a page asked for. */
export interface YearRow {
	readonly index: number
	readonly period: string
	readonly figures: readonly Triple[]
}

/** The period a row is shown under: the shared one, else the what-if's own, else the baseline's. */
function periodOf(row: AnnualRow): string {
	const span = row.periods.b ?? row.periods.a
	if (span === null) return "—"
	return `${formatDate(span.from)} – ${formatDate(span.to)}`
}

/** One figure of one year as a triple, or null when the year has no such figure (a Levy the plan lacks). */
function tripleOf(row: AnnualRow, key: YearFigure): Triple | null {
	const figure = row[key]
	const meta = FIGURES.find((entry) => entry.key === key)
	if (figure === undefined || meta === undefined) return null
	const side = (amount: string | null) =>
		amount === null ? textCell("No such year") : moneyCell(amount)
	return {
		key,
		label: meta.label,
		whatIf: side(figure.b),
		baseline: side(figure.a),
		change: moneyChange(figure.delta, meta.words, YEAR_REASON),
	}
}

/**
 * The years of a what-if, from the compare's annual table: each year's figures as the what-if (side B), the
 * baseline (side A) and the CLI's `delta`. A year whose periods differ has `delta: null`, so it shows no change.
 */
export function yearRows(data: ProjectionCompare, keys: readonly YearFigure[]): readonly YearRow[] {
	const table = data.tables.find((entry) => entry.name === "annual")
	if (table === undefined) return []
	return table.rows.map((row) => ({
		index: row.index,
		period: periodOf(row),
		figures: keys.flatMap((key) => {
			const triple = tripleOf(row, key)
			return triple === null ? [] : [triple]
		}),
	}))
}

/** Every figure the annual table can state, in the order of the Projection page's table. */
export const ALL_YEAR_FIGURES: readonly YearFigure[] = FIGURES.map((entry) => entry.key)

/** The labels of the figures any year states, in column order: a Levy column shows only when a year has one. */
export function yearLabels(rows: readonly YearRow[]): readonly string[] {
	const labels = FIGURES.map((entry) => entry.label) as string[]
	return labels.filter((label) =>
		rows.some((row) => row.figures.some((one) => one.label === label)),
	)
}
