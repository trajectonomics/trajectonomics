import { dayNumber } from "../../chart"
import type { AccountList, TxList } from "../../contract"
import { formatDate } from "../../format"
import { monthBefore } from "./month-shift"

/** One account's row on the Ledger focus point: its name, its last record, and where that sits. */
export interface LedgerFocusRow {
	readonly key: string
	readonly name: string
	/** The last day a transaction posted to it in the window, or null when it holds none. */
	readonly last: string | null
	/** Its place on the time axis, from 0 to 1, placed for drawing only. */
	readonly x: number
	/** True when it holds no record in the window, or its last is before the As-of's month. */
	readonly stale: boolean
}

/** The Ledger page's focus point: when each account was last recorded, on the Snapshot's window. */
export interface LedgerFocus {
	/** The question and the answer, for the sr-only heading. */
	readonly label: string
	/** The newest last record in the window, the display answer; null when none is there. */
	readonly newest: string | null
	/** The window's first day, the axis's start. */
	readonly start: string
	/** The As-of, the axis's end. */
	readonly asOf: string
	readonly accounts: number
	readonly stale: number
	readonly rows: readonly LedgerFocusRow[]
}

/** The last day a transaction posted to each account inside the window, by account id, compared as text. */
function lastDates(transactions: TxList, since: string, asOf: string): ReadonlyMap<string, string> {
	const last = new Map<string, string>()
	for (const transaction of transactions.transactions) {
		if (transaction.date < since || transaction.date > asOf) continue
		for (const posting of transaction.postings) {
			const prior = last.get(posting.account.id)
			if (prior === undefined || transaction.date > prior) {
				last.set(posting.account.id, transaction.date)
			}
		}
	}
	return last
}

/** The accounts a person records a value for: what they hold and what they owe, never income, spending or equity. */
const RECORDED: ReadonlySet<string> = new Set(["asset", "liability"])

/**
 * The focus point of the accounts Read and the transactions Read, on the Snapshot's window from `since` to
 * `asOf`: the transactions Read holds only that window (`tx list --since`). Null when there is no active
 * account, which is the page's own empty state. Every date is the CLI's string; a day becomes a number only
 * to place its dot (web ADR 0002).
 */
export function ledgerFocusView(
	accounts: AccountList,
	transactions: TxList,
	asOf: string,
	since: string,
): LedgerFocus | null {
	const active = accounts.accounts.filter(
		(account) => account.archivedAt === null && RECORDED.has(account.type),
	)
	if (active.length === 0) return null
	const last = lastDates(transactions, since, asOf)
	const span = dayNumber(asOf) - dayNumber(since)
	const staleBefore = monthBefore(asOf)
	let newest: string | null = null
	const rows = active.map((account) => {
		const date = last.get(account.id) ?? null
		if (date !== null && (newest === null || date > newest)) newest = date
		return {
			key: account.id,
			name: account.name,
			last: date,
			x: date === null || span <= 0 ? 0 : (dayNumber(date) - dayNumber(since)) / span,
			stale: date === null || date < staleBefore,
		}
	})
	const stale = rows.filter((row) => row.stale).length
	const answer = newest === null ? `Not since ${formatDate(since)}` : formatDate(newest)
	return {
		label: `When did you last record your accounts? ${answer}. ${active.length} accounts, ${stale} not recorded in the last month.`,
		newest,
		start: since,
		asOf,
		accounts: active.length,
		stale,
		rows,
	}
}
