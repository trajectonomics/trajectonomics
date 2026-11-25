import { type TrialBalanceRow, trialBalance, trialBalanceRows } from "@trajectonomics/core/ledger"
import type { AppError } from "../errors"
import { fail, isAppError } from "../errors"
import type { Ledger } from "../store"
import { query, respell } from "./errors"
import { accountIndex, inAccountOrder, trialRowOf, trialTotalOf } from "./rows"
import { isTotalRefused, TRIAL_TOTAL, totalRead } from "./total"
import type { TrialBalanceReport } from "./view"

const fields = (field: string) => respell(field, [])

/** A Trial Balance as `balance` states it, with the core rows it was rendered from. */
export type TrialRead = {
	report: TrialBalanceReport
	/** The rows the core read, which `columnsAgree` compares without reading the Ledger again. */
	rows: readonly TrialBalanceRow[]
}

/**
 * The Trial Balance as `balance` states it: when a column's sum leaves the safe range while every
 * row is inside it, the rows are still stated and the totals are null with the refusal (ADR-0079).
 */
export function trialReport(ledger: Ledger, asOf: string): TrialRead | AppError {
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
	const report: TrialBalanceReport = isTotalRefused(read)
		? { rows, totals: null, totalsError: read.totalRefused.body }
		: { rows, totals: read.totals.map(trialTotalOf) }
	return { report, rows: stated }
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
	if (trial.report.totals?.some((row) => row.debit !== row.credit)) return fail("internal")
	return trial.report
}
