import { FAN_LEVELS, fanSeriesName, type LineSeries, toChartNumber } from "../../chart"
import type { ProjectionChance } from "../../contract"
import { formatDate, formatMoney, formatShare } from "../../format"
import { type ChanceSource, chanceSourceWords } from "../assumptions/chance"

/**
 * A roll-up's year is labelled on every fifth bar, and on every tenth once the row passes 50 bars, so a
 * row of many bars keeps a readable axis: at 360px, 60 bars are about 5px apart and a year is 26px wide.
 */
const LABEL_EVERY = 5
const BARS_PER_LABEL_STEP = 50

/** The share and its facts, as the Home card shows them. Every figure is the CLI's, shown as it stands. */
export interface ChanceSummary {
	/** The success share, from the CLI's basis points: "87.30%". */
	readonly share: string
	readonly succeeded: number
	readonly paths: number
	readonly horizon: string
	readonly currency: string
}

/** One failing-path count at one roll-up, with the year on every fifth bar and a title for each. */
export interface RunsOutBar {
	readonly label: string | null
	/** The roll-up's end, as a date. */
	readonly ends: string
	readonly paths: number
	readonly title: string
}

/** One row of the Bands table the CLI prints: the 10th, 50th and 90th Percentiles at one roll-up end, as money. */
export interface BandRow {
	/** The roll-up's end, as a date. */
	readonly ends: string
	readonly p10: string
	readonly p50: string
	readonly p90: string
}

/** The whole Chance of success page for one Scenario: the summary, the inputs, the Bands and the bars. */
export interface ChanceView extends ChanceSummary {
	readonly definition: { readonly modelId: string; readonly seed: string; readonly paths: number }
	/** One series per fan Percentile, one point per roll-up, in the Percentile order of FAN_LEVELS. */
	readonly series: readonly LineSeries[]
	readonly runsOut: readonly RunsOutBar[]
	/** The CLI's Bands table: a few roll-up ends, for the visually hidden table beside the charts. */
	readonly bandRows: readonly BandRow[]
	/** The CLI's plain sentences, which a person should read beside the figures. */
	readonly notes: readonly string[]
	/** Where the Return model came from: the plan's own Accounts, or a file (web ADR 0018). */
	readonly source: ChanceSource
}

/** The summary of one chance read: the share and the facts beside it. */
export function chanceSummaryOf(read: ProjectionChance): ChanceSummary {
	return {
		share: formatShare(read.successBps),
		succeeded: read.succeeded,
		paths: read.paths,
		horizon: formatDate(read.horizon),
		currency: read.currency,
	}
}

/** The whole page view of one chance read. Pure: the chart's numbers are placed from the CLI's strings. */
export function chanceViewOf(read: ProjectionChance): ChanceView {
	return {
		...chanceSummaryOf(read),
		definition: read.definition,
		series: fanSeriesOf(read.bands),
		runsOut: runsOutBarsOf(read.runsOut),
		bandRows: bandRowsOf(read.tables),
		notes: read.notes,
		source: chanceSourceWords(read),
	}
}

/** The year a roll-up's last day falls in, read as text: the CLI's date, not a calendar computation. */
function yearOf(date: string): string {
	return date.slice(0, 4)
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

/** The bars of the failing paths by roll-up, in order, with a label on every fifth year (see LABEL_EVERY). */
export function runsOutBarsOf(rows: ProjectionChance["runsOut"]): RunsOutBar[] {
	const every = LABEL_EVERY * Math.ceil(rows.length / BARS_PER_LABEL_STEP)
	return rows.map((row) => {
		const year = yearOf(row.to)
		const noun = row.paths === 1 ? "path runs" : "paths run"
		return {
			label: row.index % every === 0 ? year : null,
			ends: formatDate(row.to),
			paths: row.paths,
			title: `${row.paths} failing ${noun} out in ${year}`,
		}
	})
}
