import type { Context, Result } from "../command"
import { checkedAsOf } from "../date"
import { type AppError, isAppError } from "../errors"
import { firstTransactionDateOf, recordStartOf } from "../report/record"
import { accountIndex, inAccountOrder } from "../report/rows"
import { withLedger } from "../report/with-ledger"
import type { Ledger } from "../store"
import { type StatedRow, statedRowOf, totalsOf } from "./rates-rows"
import { ratesSumsOf } from "./rates-sums"
import type { BaselineRates, RateTotals } from "./rates-view"
import { rateWindowOf } from "./rates-window"

const EMPTY_HINT = 'Run "traj tx add" to record a Transaction, then read the rates again.'

/** The row each Account with activity states, in `account list` order. */
function rowsOf(
	ledger: Ledger,
	asOf: string,
	monthKeys: readonly string[],
	sums: ReadonlyMap<string, readonly bigint[]>,
): readonly StatedRow[] | AppError {
	const index = accountIndex(ledger.accounts)
	const candidates = inAccountOrder(
		[...sums.keys()].map((accountId) => ({ accountId })),
		index,
	)
	const stated: StatedRow[] = []
	for (const { accountId } of candidates) {
		const account = index.byId.get(accountId)
		if (account === undefined) continue
		const row = statedRowOf(account, sums.get(accountId) ?? [], monthKeys, asOf)
		if (isAppError(row)) return row
		if (row !== null) stated.push(row)
	}
	return stated
}

/** The rates of one assembled Ledger; the Command only renders the result. */
export function baselineRatesOf(
	ledger: Ledger,
	asOf: string,
	months: number,
): BaselineRates | AppError {
	const first = firstTransactionDateOf(ledger.transactions)
	const { window, covered, monthKeys } = rateWindowOf(asOf, months, first)
	const sums = ratesSumsOf(ledger, monthKeys)
	if (isAppError(sums)) return sums
	const stated = rowsOf(ledger, asOf, monthKeys, sums)
	if (isAppError(stated)) return stated
	const totals = { income: 0n, expense: 0n }
	for (const { row, total } of stated) {
		if (row.type === "income") totals.income += total
		else totals.expense += total
	}
	const entries = [
		totalsOf("income", totals.income, monthKeys.length),
		totalsOf("expense", totals.expense, monthKeys.length),
	]
	const bad = entries.find(isAppError)
	if (bad !== undefined) return bad
	const hint = ledger.transactions.length === 0 ? EMPTY_HINT : undefined
	return {
		asOf,
		months,
		window,
		covered,
		monthsCovered: monthKeys.length,
		...recordStartOf(ledger.transactions, asOf),
		currency: "THB",
		rounding: "half-away-from-zero",
		rows: stated.map((entry) => entry.row),
		totals: entries.filter((entry): entry is RateTotals => !isAppError(entry)),
		...(hint === undefined ? {} : { hint }),
	}
}

/** `traj baseline rates`: one read of the Ledger, then each Account's run-rate over it. */
export function baselineRates(
	ctx: Context,
	input: { asOf: string; months?: number | undefined },
): Result<BaselineRates> | AppError {
	const checked = checkedAsOf(input.asOf)
	if (isAppError(checked)) return checked
	return withLedger(ctx, (ledger) => baselineRatesOf(ledger, input.asOf, input.months ?? 12))
}
