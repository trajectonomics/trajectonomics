import { type LineSeries, toChartNumber } from "../../chart"
import { formatMoney } from "../../format"
import type { AccountNames } from "../account-names"
import type { Terms } from "../projection/terms"
import { dashLater, linesOf, tableOf } from "./lines"
import { chartNotes, type Drawn } from "./notes"
import { reasonFor } from "./reasons"
import { missingNames } from "./series-missing"
import type { ChartDef, Resolved } from "./types"
import { periodText } from "./year"

/** One series the chart does not draw on this plan, and the reason. */
export interface MissingSeries {
	readonly id: string
	readonly name: string
	readonly reason: string
}

/** The text alternative: a table with one row per period end and a column per drawn series, in the CLI's strings. */
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

/** The line chart's series: each point placed by `toChartNumber`, and shown as the CLI's string. */
function lineOf(drawn: Drawn): LineSeries {
	return {
		name: drawn.name,
		dashed: drawn.dashed,
		dotted: drawn.dotted,
		points: drawn.points.map((point) => ({
			x: point.x,
			xLabel: point.label,
			xTitle: periodText(point),
			partial: point.period?.partial === true,
			y: toChartNumber(point.amount),
			display: formatMoney(point.amount),
		})),
	}
}

/**
 * The series a chart draws on a plan, for the terms asked for. A series with a real figure from `traj`
 * follows the terms; one without is drawn nominal and named so. A stacked chart stacks one set of
 * terms: real only when every series drawn has a real figure, else nominal, and it says so. A chosen
 * series the plan lacks is listed as missing with its reason, and the rest are drawn.
 */
export function chartView(
	chart: ChartDef,
	available: ReadonlyMap<string, Resolved>,
	names: ReadonlyMap<string, string>,
	terms: Terms,
	accounts: AccountNames = new Map(),
): ChartView {
	const found = chart.series.map((id) => ({ id, series: available.get(id) }))
	const present = found.flatMap((item) => (item.series ? [item.series] : []))
	const stacked = chart.kind.startsWith("stacked")
	const allReal = present.every((item) => item.real !== null)
	const stackedNominal = stacked && (terms === "both" || (terms === "real" && !allReal))
	const effective: Terms = stackedNominal ? "nominal" : terms
	const drawn = present.flatMap((item) => linesOf(item, effective))
	const lines = chart.kind === "line" ? drawn.map(dashLater) : drawn
	const has = new Set(available.keys())
	const absent = found.flatMap((item) => (item.series ? [] : [item.id]))
	const missing = missingNames(absent, names, accounts)
	return {
		series: lines.map(lineOf),
		table: tableOf(lines),
		missing: found
			.filter((item) => !item.series)
			.map((item) => ({
				id: item.id,
				name: missing.get(item.id) ?? item.id,
				reason: reasonFor(item.id, has),
			})),
		notes: chartNotes({
			kind: chart.kind,
			lines,
			stackedNominal: stackedNominal ? terms : null,
			nominalLabelled: present.some((item) => item.real === null) && effective !== "nominal",
		}),
	}
}
