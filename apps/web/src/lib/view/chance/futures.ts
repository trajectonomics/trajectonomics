import { toChartNumber } from "../../chart"
import type { ProjectionChance } from "../../contract"
import { formatMonth } from "../../format"
import { compareMoney } from "./order"

/** The rows a page of the table holds. */
export const PAGE_SIZE = 25

type Outcome = NonNullable<ProjectionChance["outcomes"]>[number]

/** One Market path in the table or on a card: what the CLI states of it, worded for the page. */
export interface Future {
	readonly index: number
	/** The net worth the path closed at, as the CLI states it. */
	readonly closing: string
	readonly lowest: string
	/** The roll-up the path was lowest in, by its first month: "Oct 2051". The CLI states the roll-up's first day. */
	readonly lowestFrom: string
	/** The month the path ran out, "Jun 2052", or null when it lasted to the Horizon. */
	readonly ranOut: string | null
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
		lowestFrom: formatMonth(outcome.lowestYear),
		ranOut: outcome.runsOut === null ? null : formatMonth(outcome.runsOut.date),
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

/** How the table is ordered: the worst closing net worth first, as the CLI's own table lists them, or the best. */
export type Order = "worst" | "best"

/** What the table shows: the order, the filter and the page, counted from one. */
export interface TableChoice {
	readonly order: Order
	readonly onlyRanOut: boolean
	readonly page: number
}

/** One page of the table, with the counts the page says beside it. */
export interface FuturesPage {
	readonly rows: readonly Future[]
	/** The rows the filter keeps, across every page. */
	readonly total: number
	readonly page: number
	readonly pages: number
	/** The first and last row of this page among the kept ones, counted from one; 0 and 0 for no rows. */
	readonly from: number
	readonly to: number
}

/**
 * The futures the table shows. They are sorted by closing net worth by comparing the CLI's strings (`compareMoney`, no
 * number is made of one), a tie going to the lower index as in the CLI's own table; the filter keeps the futures that ran
 * out; a page is `PAGE_SIZE` rows. Nothing here adds or converts a figure.
 */
export function pageOfFutures(futures: readonly Future[], choice: TableChoice): FuturesPage {
	const kept = choice.onlyRanOut ? futures.filter((future) => future.ranOut !== null) : futures
	const sign = choice.order === "worst" ? 1 : -1
	const sorted = [...kept].sort(
		(a, b) => sign * compareMoney(a.closing, b.closing) || a.index - b.index,
	)
	const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
	const page = Math.min(Math.max(1, choice.page), pages)
	const start = (page - 1) * PAGE_SIZE
	const rows = sorted.slice(start, start + PAGE_SIZE)
	return {
		rows,
		total: sorted.length,
		page,
		pages,
		from: rows.length === 0 ? 0 : start + 1,
		to: start + rows.length,
	}
}
