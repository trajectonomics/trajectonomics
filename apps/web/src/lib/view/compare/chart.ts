import type { LinePoint, LineSeries } from "../../chart/line"
import { toChartNumber } from "../../chart/number"
import type { ProjectionCompare, ProjectionRun, Read } from "../../contract"
import { formatMoney, formatMonth } from "../../format"

/** Nominal or real money, the choice the chart makes. */
export type Terms = "nominal" | "real"

/** A Scenario's Projection as the chart needs it: its name, its Read, and whether its line is dashed. */
export interface ChartSide {
	readonly name: string
	readonly read: Read<ProjectionRun> | undefined
	readonly dashed: boolean
}

/** The chart is either drawn, or not, and then the reasons are the words the page shows. */
export type ChartState =
	| { readonly kind: "chart"; readonly series: readonly LineSeries[] }
	| { readonly kind: "unavailable"; readonly reasons: readonly string[] }

type AnnualRow = Extract<ProjectionRun["tables"][number], { name: "annual" }>["rows"][number]

/** The year-by-year chart of both Projections, or the reason it cannot be drawn. */
export function comparisonChart(sides: readonly [ChartSide, ChartSide], terms: Terms): ChartState {
	const reasons = sides.flatMap(unreadableReason)
	if (reasons.length > 0) return { kind: "unavailable", reasons }
	return {
		kind: "chart",
		series: sides.map((side) => ({
			name: side.name,
			dashed: side.dashed,
			points: side.read?.ok
				? annualRows(side.read.data).map((row, index) => point(row, index, terms))
				: [],
		})),
	}
}

function unreadableReason(side: ChartSide): string[] {
	if (side.read === undefined) return [`There is no Projection of ${side.name} to chart.`]
	if (!side.read.ok)
		return [`The Projection of ${side.name} could not be read: ${side.read.error.message}`]
	return []
}

function annualRows(run: ProjectionRun): readonly AnnualRow[] {
	return run.tables.flatMap((table) => (table.name === "annual" ? table.rows : []))
}

function point(row: AnnualRow, index: number, terms: Terms): LinePoint {
	const amount = terms === "real" ? row.realNetWorth.amount : row.closingNetWorth
	return {
		x: index,
		xLabel: formatMonth(row.to),
		y: toChartNumber(amount),
		display: formatMoney(amount),
	}
}

/** The terms the address bar asks for; anything but "real" is nominal. */
export function parseTerms(raw: string): Terms {
	return raw === "real" ? "real" : "nominal"
}

/** A and B as chart sides: their Projections are looked up by Scenario name, and B is dashed. */
export function chartSides(
	projections: Readonly<Record<string, Read<ProjectionRun>>>,
	data: ProjectionCompare,
): [ChartSide, ChartSide] {
	const a = data.sides.a.scenario.name
	const b = data.sides.b.scenario.name
	return [
		{ name: a, read: projections[a], dashed: false },
		{ name: b, read: projections[b], dashed: true },
	]
}
