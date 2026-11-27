import { FAN_LEVELS, fanSeriesName, type LineSeries, toChartNumber } from "../../chart"
import type { ProjectionChance } from "../../contract"
import { formatMoney, formatShare, trimPercent } from "../../format"
import { chanceLasts } from "../chance/words"
import { levelWords } from "./words"

/** One Percentile of the lowest year a path spent, in plain words, with the CLI's amount. */
export interface LowestLevel {
	readonly level: number
	readonly words: string
	readonly amount: string
}

/** What a rule pays across the Market paths of a chance read, as the page shows it. */
export interface BandsView {
	/** One series per fan Percentile, one point per roll-up, for the same fan the net-worth Bands use. */
	readonly series: readonly LineSeries[]
	/** The lowest whole year of each path, by level: empty when no path has a whole Rule year. */
	readonly lowest: readonly LowestLevel[]
	/** How many paths have a whole Rule year; a path that ran out counts 0. */
	readonly counted: number
	readonly paths: number
}

/** The plan's own chance of success, from its chance read: with or without a spending rule. */
export interface ChanceLine {
	readonly share: string
	readonly succeeded: number
	readonly paths: number
	/** "Lasts to 2028 in 174 of 200 markets." */
	readonly lasts: string
}

/** The chance of success of a chance read, in the words the chance page uses. */
export function chanceLineOf(chance: ProjectionChance): ChanceLine {
	return {
		share: trimPercent(formatShare(chance.successBps)),
		succeeded: chance.succeeded,
		paths: chance.paths,
		lasts: chanceLasts(chance.succeeded, chance.paths, chance.horizon),
	}
}

/** The year a roll-up's last day falls in, read as text from the CLI's date. */
function yearOf(date: string): string {
	return date.slice(0, 4)
}

/** The spending Bands as the fan's series. The y value is placed through toChartNumber, the one place a figure becomes a number. */
function seriesOf(bands: NonNullable<ProjectionChance["spendingBands"]>): LineSeries[] {
	return FAN_LEVELS.map((level) => ({
		name: fanSeriesName(level),
		points: bands.flatMap((band) =>
			band.spending
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

/** The Bands of a chance read, or null when the plan has no spending rule (the CLI states neither Bands nor lowest year). */
export function bandsOf(chance: ProjectionChance): BandsView | null {
	if (chance.spendingBands === undefined || chance.lowestYearSpending === undefined) return null
	return {
		series: seriesOf(chance.spendingBands),
		lowest: chance.lowestYearSpending.spending.map((one) => ({
			level: one.level,
			words: levelWords(one.level),
			amount: one.value,
		})),
		counted: chance.lowestYearSpending.paths,
		paths: chance.paths,
	}
}
