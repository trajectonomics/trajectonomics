/**
 * A real asset's value over time as `traj projection run --accounts` states it (cli ADR 0060): one point per
 * Annual roll-up from the `balances` rows, and the purchase and sale marked where their dates fall. The page
 * computes no value: each point is the CLI's decimal string, and the markers are the document's own dates.
 */
import {
	type DaySpan,
	dayPosition,
	type LineMarker,
	type LineSeries,
	toChartNumber,
} from "../../chart"
import type { ProjectionRun } from "../../contract"
import { formatMoney } from "../../format"
import { annualRowsOf } from "../projection/annual"
import type { AssetParts } from "./asset-parts"

type Table = ProjectionRun["tables"][number]
type BalanceRow = Extract<Table, { name: "balances" }>["rows"][number]

/** What a value chart draws: its series, and the marks for the dates the asset was bought and sold. */
export interface AssetChart {
	readonly series: readonly LineSeries[]
	readonly markers: readonly LineMarker[]
}

/** The `balances` rows of one Account, in date order. Empty without the table, which only `--accounts` adds. */
export function balancesOf(run: ProjectionRun, account: string): BalanceRow[] {
	return run.tables.flatMap((table) =>
		table.name === "balances" ? table.rows.filter((row) => row.account === account) : [],
	)
}

/** The annual rows as spans of days, so a date finds the year it falls in. */
function spansOf(run: ProjectionRun): DaySpan[] {
	return annualRowsOf(run).map((row) => ({ index: row.index, from: row.from, to: row.to }))
}

/** The marks of the dates the asset is bought and sold, where the rows hold them. */
function markersOf(run: ProjectionRun, parts: AssetParts): LineMarker[] {
	const spans = spansOf(run)
	const dated: [string, string | undefined][] = [
		["Bought", parts.purchase?.start],
		["Sold", parts.sale?.start],
	]
	return dated.flatMap(([label, date]) => {
		const x = date === undefined ? null : dayPosition(spans, date)
		return x === null ? [] : [{ x, label }]
	})
}

/** One series: the balance rows placed at the annual row each one's date falls in. */
function seriesOf(
	rows: readonly BalanceRow[],
	spans: readonly DaySpan[],
	name: string,
	pick: (row: BalanceRow) => string,
): LineSeries {
	const points = rows.flatMap((row) => {
		const span = spans.find((item) => row.date >= item.from && row.date <= item.to)
		if (span === undefined) return []
		const amount = pick(row)
		return [
			{
				x: span.index,
				xLabel: span.to.slice(0, 4),
				y: toChartNumber(amount),
				display: formatMoney(amount),
			},
		]
	})
	return { name, points, ...(name === NOMINAL ? {} : { dashed: true }) }
}

const NOMINAL = "Value"
const REAL = "Value in today's money"

/** The value chart of an asset, or null when the run states no value for it (it was run without `--accounts`). */
export function assetChartOf(run: ProjectionRun | undefined, parts: AssetParts): AssetChart | null {
	if (run === undefined) return null
	const rows = balancesOf(run, parts.account.id)
	if (rows.length === 0) return null
	const spans = spansOf(run)
	return {
		series: [
			seriesOf(rows, spans, NOMINAL, (row) => row.amount),
			seriesOf(rows, spans, REAL, (row) => row.real),
		],
		markers: markersOf(run, parts),
	}
}
