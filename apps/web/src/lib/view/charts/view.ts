import { type LineSeries, toChartNumber } from "../../chart"
import { formatMoney } from "../../format"
import type { Terms } from "../projection/terms"
import { reasonFor } from "./catalogue"
import type { ChartDef, Pt, Resolved } from "./types"

/** One series the chart does not draw on this plan, and the reason. */
export interface MissingSeries {
	readonly id: string
	readonly name: string
	readonly reason: string
}

/** The text alternative: a table with one row per year and a column per drawn series, in the CLI's strings. */
export interface ChartTable {
	readonly headers: readonly string[]
	readonly rows: readonly { readonly label: string; readonly cells: readonly (string | null)[] }[]
}

/** What the page draws for one chart on one plan. */
export interface ChartView {
	readonly series: readonly LineSeries[]
	readonly table: ChartTable
	readonly missing: readonly MissingSeries[]
	readonly notes: readonly string[]
}

/** One line to draw: its name, whether it is dashed, and the CLI's figures it is drawn from. */
interface Drawn {
	readonly name: string
	readonly dashed: boolean
	readonly points: readonly Pt[]
}

/** The line chart's series: each point placed by `toChartNumber`, and shown as the CLI's string. */
function lineOf(drawn: Drawn): LineSeries {
	return {
		name: drawn.name,
		dashed: drawn.dashed,
		points: drawn.points.map((point) => ({
			x: point.x,
			xLabel: point.label,
			y: toChartNumber(point.amount),
			display: formatMoney(point.amount),
		})),
	}
}

/**
 * The series a chart draws on a plan, for the terms asked for. A series with a real figure from `traj`
 * follows the terms; one without is drawn nominal and named so. A stacked chart stacks one set of
 * terms, so "both" draws it nominal and says so. A chosen series the plan lacks is listed as missing
 * with its reason, and the rest are drawn.
 */
export function chartView(
	chart: ChartDef,
	available: ReadonlyMap<string, Resolved>,
	names: ReadonlyMap<string, string>,
	terms: Terms,
): ChartView {
	const stacked = chart.kind.startsWith("stacked")
	const effective: Terms = stacked && terms === "both" ? "nominal" : terms
	const found = chart.series.map((id) => ({ id, series: available.get(id) }))
	const drawn = found.flatMap((item) => (item.series ? linesOf(item.series, effective) : []))
	const lines = chart.kind === "line" ? drawn.map(dashLater) : drawn
	const nominalLabelled =
		found.some((item) => item.series?.real === null) && effective !== "nominal"
	return {
		series: lines.map(lineOf),
		table: tableOf(lines),
		missing: found
			.filter((item) => !item.series)
			.map((item) => ({
				id: item.id,
				name: names.get(item.id) ?? item.id,
				reason: reasonFor(item.id),
			})),
		notes: [
			...(stacked && terms === "both" ? [STACKED_NOTE] : []),
			...(nominalLabelled ? [NOMINAL_NOTE] : []),
		],
	}
}

const STACKED_NOTE = "A stacked chart draws one set of terms, so it is nominal."
const NOMINAL_NOTE = "Series marked nominal have no figure in today's money from `traj`."

/** The lines one series draws for the terms: its nominal line, its real line, or both. */
function linesOf(found: Resolved, terms: Terms): Drawn[] {
	const { real } = found
	if (real === null) {
		const suffix = terms === "nominal" ? "" : " (nominal)"
		return [{ name: `${found.name}${suffix}`, dashed: false, points: found.nominal }]
	}
	return [
		...(terms === "real" ? [] : [{ name: found.name, dashed: false, points: found.nominal }]),
		...(terms === "nominal"
			? []
			: [{ name: `${found.name}, in As-of terms`, dashed: true, points: real }]),
	]
}

/** The second round of the palette is told apart by its dash, so a colour is never used twice alike. */
function dashLater(line: Drawn, index: number): Drawn {
	return index >= 4 ? { ...line, dashed: true } : line
}

/** The text alternative: a row per year, and each series' CLI string in it, or null where it has no figure. */
function tableOf(lines: readonly Drawn[]): ChartTable {
	const years = new Map(
		lines.flatMap((line) => line.points.map((point) => [point.x, point.label] as const)),
	)
	return {
		headers: lines.map((line) => line.name),
		rows: [...years]
			.sort((a, b) => a[0] - b[0])
			.map(([x, label]) => ({
				label,
				cells: lines.map((line) => line.points.find((point) => point.x === x)?.amount ?? null),
			})),
	}
}
