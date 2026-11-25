import { trialBalance, trialBalanceRows } from "@trajectonomics/core/ledger"
import type { AppError } from "../errors"
import { fail, isAppError } from "../errors"
import type { Ledger } from "../store"
import { query, respell } from "./errors"
import { accountIndex, inAccountOrder, trialRowOf, trialTotalOf } from "./rows"
import { isTotalRefused, TRIAL_TOTAL, totalRead } from "./total"
import type { TrialBalanceReport, TrialBalanceView } from "./view"

const fields = (field: string) => respell(field, [])

/**
 * The Trial Balance at a date, asserting nothing, and refusing the call when a column's sum leaves
 * the safe range: `doctor` reports each disagreement as the finding it went looking for, and a total
 * it cannot state is not a finding it can compare.
 */
export function trialBalanceAt(ledger: Ledger, asOf: string): TrialBalanceView | AppError {
	const index = accountIndex(ledger.accounts)
	const result = query(() => trialBalance(ledger.transactions, asOf, ledger.chart), fields)
	if (isAppError(result)) return result
	return {
		rows: inAccountOrder(result.rows, index).map((row) => trialRowOf(row, index)),
		totals: result.totals.map(trialTotalOf),
	}
}

/**
 * The Trial Balance as `balance` states it: when a column's sum leaves the safe range while every
 * row is inside it, the rows are still stated and the totals are null with the refusal (ADR-0079).
 */
function trialReport(ledger: Ledger, asOf: string): TrialBalanceReport | AppError {
	const index = accountIndex(ledger.accounts)
	const read = totalRead(
		() => trialBalance(ledger.transactions, asOf, ledger.chart),
		fields,
		TRIAL_TOTAL,
	)
	if (isAppError(read)) return read
	const stated = isTotalRefused(read)
		? query(() => trialBalanceRows(ledger.transactions, asOf, ledger.chart), fields)
		: read.rows
	if (isAppError(stated)) return stated
	const rows = inAccountOrder(stated, index).map((row) => trialRowOf(row, index))
	return isTotalRefused(read)
		? { rows, totals: null, totalsError: read.totalRefused.body }
		: { rows, totals: read.totals.map(trialTotalOf) }
}

/**
 * The Trial Balance, asserting the one thing it exists to say: each currency's debits equal its
 * credits. The core re-validates every stored Transaction, so a tampered Posting fails earlier
 * with UNBALANCED_TRANSACTION; this guards a core arithmetic bug and is not a declared code.
 */
export function trialOf(ledger: Ledger, asOf: string): TrialBalanceReport | AppError {
	const trial = trialReport(ledger, asOf)
	if (isAppError(trial)) return trial
	// ADR-0013 keeps the catch-all's bytes fixed, so the guard states nothing of its own.
	if (trial.totals?.some((row) => row.debit !== row.credit)) return fail("internal")
	return trial
}
