import type { CurrencyTotal, NetWorth, Read } from "../../contract"
import { formatDate } from "../../format"
import { netWorthHistorySeries } from "../overview/net-worth-history"

/** One month-end of the history as a table row: its totals, or null where its Read failed. */
export interface MonthEndRow {
	readonly index: number
	readonly asOf: string
	readonly totals: readonly CurrencyTotal[] | null
	/** The CLI's error code for a month that could not be read. */
	readonly code: string | null
}

/** The history's rows, one per month-end in the order the Snapshot holds them. */
export function monthEndRows(reads: readonly Read<NetWorth>[]): MonthEndRow[] {
	return reads.map((read, index) =>
		read.ok
			? { index, asOf: formatDate(read.data.asOf), totals: read.data.totals, code: null }
			: { index, asOf: monthOfArgv(read.argv), totals: null, code: read.error.code },
	)
}

/** The As-of a failed month was asked for, read from its argv: `report networth --as-of <date>`. */
function monthOfArgv(argv: readonly string[]): string {
	const at = argv.indexOf("--as-of")
	const date = at === -1 ? undefined : argv[at + 1]
	return date === undefined ? "Unknown date" : formatDate(date)
}

/**
 * One line on how many month-end reads the chart used, the range they cover, and how many were
 * left out. An empty history says so rather than charting nothing.
 */
export function historyLine(reads: readonly Read<NetWorth>[]): string {
	const used = netWorthHistorySeries(reads).points
	const first = used[0]
	const last = used.at(-1)
	if (first === undefined || last === undefined) {
		return "The history has no month-end read to chart."
	}
	const noun = used.length === 1 ? "month-end read" : "month-end reads"
	const range = `from ${first.xLabel} to ${last.xLabel}`
	const left = reads.length - used.length
	const tail =
		left > 0 ? `; ${left} could not be read and ${left === 1 ? "is" : "are"} left out` : ""
	return `The history uses ${used.length} ${noun}, ${range}${tail}.`
}
