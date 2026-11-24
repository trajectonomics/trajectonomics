import type { ProjectionPath } from "../../contract"
import { formatBps, formatDate, formatMonth, MINUS } from "../../format"
import { annualRowsOf } from "../projection/annual"

/** A return in basis points as a percent with two places, with the true minus: 118 as "1.18%". */
export function returnText(bps: number): string {
	return `${formatBps(bps).replace("-", MINUS)}%`
}

/** The header's title. The CLI numbers paths from zero and so does the page, so it says "one of", never a count: "Future 6, one of 200". */
export function pathTitle(index: number, paths: number): string {
	return `Future ${index}, one of ${paths}`
}

/**
 * When the lowest point was, in the words of the table below it: the annual row that starts on the day the CLI states
 * (`lowestYear` is a roll-up's first day) is named by the month it ends in. A day that starts no row is named as the
 * day a year starts.
 */
export function lowestWhen(path: ProjectionPath, lowestYear: string): string {
	const row = annualRowsOf(path).find((entry) => entry.from === lowestYear)
	return row === undefined
		? `in the year starting ${formatDate(lowestYear)}`
		: `in the year ending ${formatMonth(row.to)}`
}
