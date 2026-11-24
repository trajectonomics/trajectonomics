import type { Future } from "./futures"
import { compareMoney } from "./order"

/** The rows a page of the table holds. */
export const PAGE_SIZE = 25

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

/** The earlier of two ISO dates first, compared as text; a future that never ran out (null) comes last. */
function compareDate(a: string | null, b: string | null): number {
	if (a === b) return 0
	if (a === null) return 1
	if (b === null) return -1
	return a < b ? -1 : 1
}

/**
 * The futures the table shows. They are sorted by closing net worth by comparing the CLI's strings (`compareMoney`, no
 * number is made of one). A tie goes to the earlier run-out (a future that lasted comes after one that ran out), then to
 * the lower index: the CLI's own table breaks a tie by index alone, but every run-out path closes at 0.00, so index alone
 * would list those in no useful order (web ADR 0020). The filter keeps the futures that ran
 * out; a page is `PAGE_SIZE` rows. Nothing here adds or converts a figure.
 */
export function pageOfFutures(futures: readonly Future[], choice: TableChoice): FuturesPage {
	const kept = choice.onlyRanOut ? futures.filter((future) => future.ranOut !== null) : futures
	const sign = choice.order === "worst" ? 1 : -1
	const sorted = [...kept].sort(
		(a, b) =>
			sign * compareMoney(a.closing, b.closing) ||
			compareDate(a.ranOutOn, b.ranOutOn) ||
			a.index - b.index,
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
