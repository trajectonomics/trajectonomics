import type { CurrencyTotal, NetWorth, Read } from "../../contract"
import { formatDate, formatMonth } from "../../format"
import { parseDate } from "../../snapshot/dates"
import { netWorthHistorySeries } from "../overview/net-worth-history"

/** One month-end of the history as a table row: its totals, or null where its Read failed or its total is not stated. */
export interface MonthEndRow {
	readonly index: number
	readonly asOf: string
	readonly totals: readonly CurrencyTotal[] | null
	/** The CLI's error code for a month that could not be read, or whose total is not stated. */
	readonly code: string | null
	/** True when the month was read and its total is not stated, as its accounts' sum is out of range (cli ADR 0079). */
	readonly unstated: boolean
}

/** The history's rows, one per month-end in the order the Snapshot holds them. */
export function monthEndRows(reads: readonly Read<NetWorth>[]): MonthEndRow[] {
	return reads.map((read, index) =>
		read.ok
			? {
					index,
					asOf: formatDate(read.data.asOf),
					totals: read.data.totals,
					code: read.data.totalsError?.code ?? null,
					unstated: read.data.totals === null,
				}
			: {
					index,
					asOf: monthOfArgv(read.argv),
					totals: null,
					code: read.error.code,
					unstated: false,
				},
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

/**
 * A sentence that says so when the history starts later than the ledger's first entry, because the Snapshot
 * holds at most the latest `HISTORY_MONTHS` month-ends (web ADR 0027); null when the history reaches the first
 * entry, or when the ledger has no first entry or the Snapshot no history. The months are compared, not the days:
 * the month of the first entry is the history's first month-end.
 */
export function historyCut(
	historyDates: readonly string[],
	firstTransactionDate: string | null,
): string | null {
	const start = historyDates[0]
	if (start === undefined || firstTransactionDate === null) return null
	const first = parseDate(firstTransactionDate)
	const from = parseDate(start)
	if (first === null || from === null) return null
	if (first.year * 12 + first.month >= from.year * 12 + from.month) return null
	const months = historyDates.length
	return `The ledger's first entry is in ${formatMonth(firstTransactionDate)}, but the chart shows only the latest ${months} month-ends, from ${formatMonth(start)}. Earlier months are left out.`
}
