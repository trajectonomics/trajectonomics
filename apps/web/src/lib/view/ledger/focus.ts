import { dayNumber } from "../../chart"
import type { AccountList, TxList } from "../../contract"
import { formatDate } from "../../format"
import { monthBefore } from "./month-shift"

/** One account's row on the Ledger focus point: its name, its last record, and where that sits. */
export interface LedgerFocusRow {
	readonly key: string
	readonly name: string
	/** The last day a transaction posted to it, or null when the period states none. */
	readonly last: string | null
	/** Its place on the time axis, from 0 to 1, placed for drawing only. */
	readonly x: number
	/** True when its last record is earlier than the newest one's month before. */
	readonly stale: boolean
}

/** The Ledger page's focus point: when each account was last recorded, on a shared time axis. */
export interface LedgerFocus {
	/** The question and the answer, for the sr-only heading. */
	readonly label: string
	/** The newest last record, the display answer. */
	readonly newest: string
	readonly start: string
	readonly accounts: number
	readonly stale: number
	readonly rows: readonly LedgerFocusRow[]
}

/** The last day a transaction posted to each account, by account id, compared as text. */
function lastDates(transactions: TxList): ReadonlyMap<string, string> {
	const last = new Map<string, string>()
	for (const transaction of transactions.transactions) {
		for (const posting of transaction.postings) {
			const prior = last.get(posting.account.id)
			if (prior === undefined || transaction.date > prior) {
				last.set(posting.account.id, transaction.date)
			}
		}
	}
	return last
}

/** The earliest and newest date of a non-empty list, compared as text. */
function extentOf(dates: readonly string[]): { readonly start: string; readonly end: string } {
	let start = dates[0] ?? ""
	let end = dates[0] ?? ""
	for (const date of dates) {
		if (date < start) start = date
		if (date > end) end = date
	}
	return { start, end }
}

/**
 * The focus point of the accounts Read and the transactions Read. Null when there is no account, or none
 * with a record to place, which is the page's own empty state. Every date is the CLI's string; a day becomes
 * a number only to place its dot (web ADR 0002).
 */
export function ledgerFocusView(accounts: AccountList, transactions: TxList): LedgerFocus | null {
	const active = accounts.accounts.filter((account) => account.archivedAt === null)
	if (active.length === 0) return null
	const last = lastDates(transactions)
	const dates = active.flatMap((account) => {
		const date = last.get(account.id)
		return date === undefined ? [] : [date]
	})
	if (dates.length === 0) return null
	const { start, end } = extentOf(dates)
	const span = dayNumber(end) - dayNumber(start)
	const staleBefore = monthBefore(end)
	const rows = active.map((account) => {
		const date = last.get(account.id) ?? null
		return {
			key: account.id,
			name: account.name,
			last: date,
			x: date === null ? 0 : span === 0 ? 1 : (dayNumber(date) - dayNumber(start)) / span,
			stale: date !== null && date < staleBefore,
		}
	})
	const stale = rows.filter((row) => row.stale).length
	return {
		label: `When did you last record your accounts? ${formatDate(end)}. ${active.length} accounts, ${stale} not recorded in the month before it.`,
		newest: end,
		start,
		accounts: active.length,
		stale,
		rows,
	}
}
