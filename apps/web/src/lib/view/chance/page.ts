import { FAN_LEVELS, fanSeriesName, type LineSeries, toChartNumber } from "../../chart"
import type { ProjectionChance } from "../../contract"
import { formatDate, formatMoney, formatShare } from "../../format"
import { type ChanceSource, chanceSourceWords } from "../assumptions/chance"

/** A roll-up's year is labelled on every fifth bar, so a row of many bars keeps a readable axis. */
const LABEL_EVERY = 5

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
	readonly paths: number
	readonly title: string
}

/** The whole Chance of success page for one Scenario: the summary, the inputs, the Bands and the bars. */
export interface ChanceView extends ChanceSummary {
	readonly definition: { readonly modelId: string; readonly seed: string; readonly paths: number }
	/** One series per fan Percentile, one point per roll-up, in the Percentile order of FAN_LEVELS. */
	readonly series: readonly LineSeries[]
	readonly runsOut: readonly RunsOutBar[]
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

/** The bars of the failing paths by roll-up, in order, with a label on every fifth year. */
export function runsOutBarsOf(rows: ProjectionChance["runsOut"]): RunsOutBar[] {
	return rows.map((row) => {
		const year = yearOf(row.to)
		const noun = row.paths === 1 ? "path runs" : "paths run"
		return {
			label: row.index % LABEL_EVERY === 0 ? year : null,
			paths: row.paths,
			title: `${row.paths} failing ${noun} out in ${year}`,
		}
	})
}
