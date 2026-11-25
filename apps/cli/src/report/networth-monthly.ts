import { checkedDate } from "../date"
import type { AppError, ErrorBody } from "../errors"
import { fail, isAppError } from "../errors"
import { hintField, hintOf } from "../hint"
import type { Ledger } from "../store"
import { monthEndsBetween } from "./month-ends"
import { type NetWorthResult, netWorthReader } from "./networth"
import { firstTransactionDateOf } from "./record"

/**
 * One month-end of `report networth --monthly`: the reading the single-date read gives, or the
 * refusal it gives, in place. A month the Ledger refuses (an account's overflow) does not hide the others; a month whose total alone
 * is refused states its rows and `totals: null` (ADR-0078).
 */
export type NetWorthMonth = NetWorthResult | { asOf: string; error: ErrorBody }

/** `traj report networth --monthly`: net worth at every month-end from `since` to `until`. */
export type NetWorthMonthlyResult = {
	since: string | null
	until: string
	months: NetWorthMonth[]
	hint?: string | undefined
}

/** The flags of the monthly form; `since` is absent when the range starts at the Ledger's first Transaction. */
export type MonthlyInput = { since?: string | undefined; until: string }

/**
 * Net worth at each month-end of an inclusive period, from one assembled read. Each month is
 * the single-date read's answer for that date, read from one scan of the Ledger, so its figures and
 * its refusal are `--as-of`'s, and a refusal of the scan itself is returned once, before any month.
 * With no `since` the range starts at the month of the Ledger's first
 * Transaction, and a Ledger with none has no month to state.
 */
export function netWorthMonthlyOf(
	ledger: Ledger,
	input: MonthlyInput,
): NetWorthMonthlyResult | AppError {
	const since = input.since === undefined ? null : checkedDate(input.since, "since")
	if (isAppError(since)) return since
	const until = checkedDate(input.until, "until")
	if (isAppError(until)) return until
	if (since !== null && since > until) {
		return fail("INVALID_PERIOD", {
			path: "since",
			message: `since: ${since} is after until ${until}`,
			details: { since, until },
		})
	}
	// A Ledger the scan refuses has no month to state: the refusal is the call's own, as `--as-of`'s.
	const read = netWorthReader(ledger)
	if (isAppError(read)) return read
	const start = since ?? firstTransactionDateOf(ledger.transactions)
	const dates = start === null ? [] : monthEndsBetween(start, until)
	const months = dates.map((date): NetWorthMonth => {
		const month = read(date)
		return isAppError(month) ? { asOf: date, error: month.body } : month
	})
	const hint =
		months.length === 0
			? hintOf({ accounts: ledger.accounts.length, transactions: ledger.transactions.length })
			: undefined
	return { since: input.since ?? null, until: input.until, months, ...hintField(hint) }
}
