import { toChartNumber } from "../../chart"
import type { ProjectionChance } from "../../contract"
import { formatDate, formatMonth } from "../../format"

type Outcome = NonNullable<ProjectionChance["outcomes"]>[number]

/** One Market path in the table or on a card: what the CLI states of it, worded for the page. */
export interface Future {
	readonly index: number
	/** The net worth the path closed at, as the CLI states it. */
	readonly closing: string
	readonly lowest: string
	/** The first day of the roll-up the path was lowest in, "31 Oct 2051": all the CLI states, so the page says the year starts there. */
	readonly lowestStart: string
	/** The month the path ran out, "Jun 2052", or null when it lasted to the Horizon. */
	readonly ranOut: string | null
	/** The day the path ran out as the CLI states it (an ISO date, compared as text), or null when it lasted. */
	readonly ranOutOn: string | null
	/** Whether the closing net worth is below zero, read from its sign. */
	readonly below: boolean
	/** The bar's length as a share of the longest bar, 0 to 100: a mark, never shown as a figure. */
	readonly bar: number
}

/** One of the "futures worth a look": a representative path with the words that name it. */
export interface FutureCard {
	readonly title: string
	readonly future: Future
}

/** Every Market path of a chance read that was asked for `--outcomes`, and the CLI's picks of the ones to open first. */
export interface FuturesView {
	readonly paths: number
	/** In path order, as the CLI lists them. */
	readonly futures: readonly Future[]
	/** How many of them ran out. */
	readonly ranOut: number
	readonly cards: readonly FutureCard[]
}

/** The path's outcome as the page words it. */
export function futureOf(outcome: Outcome, longest: number): Future {
	const closing = outcome.closingNetWorth
	const below = closing.startsWith("-") && /[1-9]/.test(closing)
	return {
		index: outcome.index,
		closing,
		lowest: outcome.lowestNetWorth,
		lowestStart: formatDate(outcome.lowestYear),
		ranOut: outcome.runsOut === null ? null : formatMonth(outcome.runsOut.date),
		ranOutOn: outcome.runsOut === null ? null : outcome.runsOut.date,
		below,
		bar: longest === 0 ? 0 : (Math.abs(toChartNumber(closing)) / longest) * 100,
	}
}

/** The title of each representative pick, in the order the page lists them. */
const PICKS = [
	["p10", "A bad future (10th percentile)"],
	["p50", "A typical future"],
	["p90", "A good future"],
	["earliestRunsOut", "The earliest run-out"],
	["lowest", "The deepest fall"],
] as const

/**
 * The table and the cards of a chance read, or null when the read lists no paths (it was made without `--outcomes`, as the
 * Demo snapshot is). Every figure is the CLI's string; the bars are placed from it through `toChartNumber`, the one
 * conversion a mark may use.
 */
export function futuresViewOf(read: ProjectionChance): FuturesView | null {
	const { outcomes, representative } = read
	if (outcomes === undefined) return null
	const longest = Math.max(0, ...outcomes.map((o) => Math.abs(toChartNumber(o.closingNetWorth))))
	const futures = outcomes.map((outcome) => futureOf(outcome, longest))
	const byIndex = new Map(futures.map((future) => [future.index, future]))
	const cards = PICKS.flatMap(([key, title]) => {
		const index = representative?.[key]
		const future = index === undefined || index === null ? undefined : byIndex.get(index)
		return future === undefined ? [] : [{ title, future }]
	})
	return {
		paths: read.paths,
		futures,
		ranOut: futures.filter((future) => future.ranOut !== null).length,
		cards,
	}
}
