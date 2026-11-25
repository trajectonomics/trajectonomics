import {
	type BalanceRow,
	balances,
	LedgerValidationError,
	type NetWorth,
} from "@trajectonomics/core/ledger"
import type { AppError } from "../errors"
import { isAppError } from "../errors"
import { type Ledger, ledgerFailure } from "../store"
import { type FieldMap, query } from "./errors"
import type { AccountIndex } from "./rows"

/** Where the core names the net worth sum across accounts; a refusal here leaves every Leaf Balance stated. */
const NET_WORTH_TOTAL = "netWorth.totals["
/** Where the core names a Trial Balance column's sum; a refusal here leaves every row stated. */
export const TRIAL_TOTAL = "trialBalance.totals["
/** Where the core names the P&L's sum; a refusal here leaves every row stated. */
export const PNL_TOTAL = "profitAndLoss.totals["

/** A refusal of a total alone: every account is in range, their sum is not (ADR-0079). */
export type TotalRefused = { totalRefused: AppError }

/** The refusal the total gives, in the fields of the error envelope, as the result carries it. */
export type TotalRefusal = {
	code: string
	exitCode: number
	message: string
	path?: string | undefined
	hint?: string | undefined
	details?: unknown
}

export function isTotalRefused(value: unknown): value is TotalRefused {
	return typeof value === "object" && value !== null && "totalRefused" in value
}

/**
 * Runs one read whose total is the sum across accounts. A refusal of that total (named by
 * `totalField`, the core's path prefix) comes back as `TotalRefused`; any other refusal, an account's
 * own overflow included, is the call's error as before.
 */
export function totalRead<T>(
	work: () => T,
	fields: FieldMap,
	totalField: string,
): T | TotalRefused | AppError {
	try {
		return work()
	} catch (error) {
		if (!(error instanceof LedgerValidationError)) throw error
		const refusal = ledgerFailure(error, fields(error.field))
		return error.field.startsWith(totalField) ? { totalRefused: refusal } : refusal
	}
}

/** One net-worth read: its total refused alone, or the call refused, as `totalRead` says. */
export function netWorthRead(
	work: () => NetWorth,
	fields: FieldMap,
): NetWorth | TotalRefused | AppError {
	return totalRead(work, fields, NET_WORTH_TOTAL)
}

/**
 * The asset and liability Leaf Balances at a date, for a read whose total was refused. They are the
 * rows `netWorth` returns, stated by `balances`, which refuses only a Leaf the net-worth read
 * would already have refused.
 */
export function countedRows(
	ledger: Ledger,
	asOf: string,
	index: AccountIndex,
	fields: FieldMap,
): BalanceRow[] | AppError {
	const rows = query(() => balances(ledger.transactions, asOf, ledger.chart), fields)
	if (isAppError(rows)) return rows
	return rows.filter((row) => {
		const type = index.byId.get(row.accountId)?.type
		return type === "asset" || type === "liability"
	})
}
