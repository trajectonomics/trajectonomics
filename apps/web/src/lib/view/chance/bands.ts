import { FAN_LEVELS, fanSeriesName, type LineSeries, toChartNumber } from "../../chart"
import type { ProjectionChance } from "../../contract"
import { formatDate, formatMoney, yearOf } from "../../format"
import type { MoneyBasis } from "./money"

/** One row of the Bands table: the 10th, 50th and 90th Percentiles at one roll-up end, as money. */
export interface BandRow {
	/** The roll-up's end, as a date. */
	readonly ends: string
	readonly p10: string
	readonly p50: string
	readonly p90: string
}

/** The Bands as one basis states them: the fan's series, and the table a screen reader reads. */
export interface BandsView {
	readonly series: readonly LineSeries[]
	readonly bandRows: readonly BandRow[]
}

/** The Bands of one chance read: today's money from the CLI's `realBands` (null when it states none), and the nominal future. */
export interface BandsByBasis {
	readonly today: BandsView | null
	readonly future: BandsView
}

/**
 * One series per Percentile of the fan. The x position is the roll-up's index, and the y value is the
 * money string placed through toChartNumber: the only place a figure becomes a number.
 */
export function fanSeriesOf(bands: ProjectionChance["bands"]): LineSeries[] {
	return FAN_LEVELS.map((level) => ({
		name: fanSeriesName(level),
		points: bands.flatMap((band) =>
			band.netWorth
				.filter((percentile) => percentile.level === level)
				.map((percentile) => ({
					x: band.index,
					xLabel: yearOf(band.to),
					y: toChartNumber(percentile.value),
					display: formatMoney(percentile.value),
				})),
		),
	}))
}

/** The Bands table's rows, as the CLI states them: the year's end as a date, the money as it stands. */
export function bandRowsOf(tables: ProjectionChance["tables"]): BandRow[] {
	for (const table of tables) {
		if (table.name !== "bands") continue
		return table.rows.map((row) => ({
			ends: formatDate(row.to),
			p10: formatMoney(row.p10),
			p50: formatMoney(row.p50),
			p90: formatMoney(row.p90),
		}))
	}
	return []
}

type Percentiles = ProjectionChance["bands"][number]["netWorth"]

/** One Percentile's money at a roll-up end, as the CLI states it, or null when the band has none. */
function levelValue(netWorth: Percentiles, level: number): string | null {
	return netWorth.find((percentile) => percentile.level === level)?.value ?? null
}

/** One Bands table row in today's money, or none when that roll-up's real band lacks a level. */
function realRow(to: string, netWorth: Percentiles): BandRow[] {
	const p10 = levelValue(netWorth, 10)
	const p50 = levelValue(netWorth, 50)
	const p90 = levelValue(netWorth, 90)
	if (p10 === null || p50 === null || p90 === null) return []
	return [
		{ ends: formatDate(to), p10: formatMoney(p10), p50: formatMoney(p50), p90: formatMoney(p90) },
	]
}

/** The Bands table's rows in today's money, at the roll-up ends the CLI prints, from its `realBands`. */
export function realBandRowsOf(
	tables: ProjectionChance["tables"],
	realBands: ProjectionChance["bands"],
): BandRow[] {
	const byIndex = new Map(realBands.map((band) => [band.index, band.netWorth]))
	for (const table of tables) {
		if (table.name !== "bands") continue
		return table.rows.flatMap((row) => {
			const netWorth = byIndex.get(row.index)
			return netWorth === undefined ? [] : realRow(row.to, netWorth)
		})
	}
	return []
}

/** The Bands in each money the read states: today's from `realBands` (null without them), the future from the nominal Bands. */
export function bandsOf(read: ProjectionChance): BandsByBasis {
	const { realBands } = read
	return {
		today:
			realBands === undefined
				? null
				: { series: fanSeriesOf(realBands), bandRows: realBandRowsOf(read.tables, realBands) },
		future: { series: fanSeriesOf(read.bands), bandRows: bandRowsOf(read.tables) },
	}
}

/** The Bands to draw for one basis: today's when the read states them, and the nominal future otherwise. */
export function bandsIn(bands: BandsByBasis, basis: MoneyBasis): BandsView {
	return basis === "today" && bands.today !== null ? bands.today : bands.future
}
