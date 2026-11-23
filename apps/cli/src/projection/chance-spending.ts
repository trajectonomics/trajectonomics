import type { ChanceOfSuccess, ChancePercentile } from "@trajectonomics/core/sim"
import type {
	ChanceLowestYearView,
	ChancePercentileView,
	ChanceSpendingBandView,
	ChanceSpendingTable,
	ChanceTableRow,
} from "./chance-spending-view"
import type { ChanceView } from "./chance-view"

/** Every fifth annual roll-up is a row of the human table, with the first and the last. */
const SHOWN_EVERY = 5

/** The money formatter every figure of one result shares. */
export type Money = (minor: number) => string

/** The engine's Percentiles in the CLI's money. */
export function percentilesOf(
	percentiles: readonly ChancePercentile[],
	money: Money,
): ChancePercentileView[] {
	return percentiles.map((percentile) => ({
		level: percentile.level,
		value: money(percentile.value),
	}))
}

/** The value at one level, or empty text when the engine states none (a lowest year with no path). */
export function valueAt(percentiles: readonly ChancePercentileView[], level: number): string {
	return percentiles.find((percentile) => percentile.level === level)?.value ?? ""
}

/** The Bands at a few roll-ups: the first, every fifth, and the last, for the human table. */
export function shownRows<T extends { index: number; to: string }>(
	bands: readonly T[],
	percentilesOfBand: (band: T) => readonly ChancePercentileView[],
): ChanceTableRow[] {
	return bands
		.filter(
			(_band, position) =>
				position === 0 || (position + 1) % SHOWN_EVERY === 0 || position === bands.length - 1,
		)
		.map((band) => ({
			index: band.index,
			to: band.to,
			p10: valueAt(percentilesOfBand(band), 10),
			p50: valueAt(percentilesOfBand(band), 50),
			p90: valueAt(percentilesOfBand(band), 90),
		}))
}

/** What a plan with a spending rule adds to the result, apart from the fields themselves. */
export type SpendingAdditions = {
	fields: Pick<ChanceView, "spendingBands" | "lowestYearSpending">
	tables: ChanceSpendingTable[]
	notes: string[]
}

/**
 * What a plan with a spending rule adds to the result (cli ADR-0063): the spending Bands, the lowest
 * year, the human tables that print a few of them, and the note that says what they count. The engine
 * states them only when the Scenario has a rule Flow, so a plan without one keeps its bytes.
 */
export function spendingOf(chance: ChanceOfSuccess, money: Money): SpendingAdditions {
	const { spending } = chance
	if (spending === undefined) return { fields: {}, tables: [], notes: [] }
	const bands: ChanceSpendingBandView[] = spending.bands.map((band) => ({
		index: band.index,
		to: band.to,
		spending: percentilesOf(band.spending, money),
	}))
	const lowestYear: ChanceLowestYearView = {
		paths: spending.lowestYear.paths,
		spending: percentilesOf(spending.lowestYear.spending, money),
	}
	const rows = shownRows(bands, (band) => band.spending)
	const at = (level: number): string => valueAt(lowestYear.spending, level)
	return {
		fields: { spendingBands: bands, lowestYearSpending: lowestYear },
		tables: [
			{ name: "spendingBands", count: rows.length, rows },
			{
				name: "lowestYearSpending",
				count: 1,
				rows: [
					{
						paths: lowestYear.paths,
						p10: at(10),
						p25: at(25),
						p50: at(50),
						p75: at(75),
						p90: at(90),
					},
				],
			},
		],
		notes: [
			`The spending Bands are what the plan's spending rules paid in each roll-up, nominal, with a path that ran out paying 0 after it did. The lowest year is each path's least whole year of spending, over the ${lowestYear.paths} of ${chance.paths} paths that have one; a path that ran out counts 0.`,
		],
	}
}
