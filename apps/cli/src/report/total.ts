import {
	type BalanceRow,
	balances,
	LedgerValidationError,
	type NetWorth,
} from "@trajectonomics/core/ledger"
import { z } from "zod"
import type { AppError } from "../errors"
import { isAppError } from "../errors"
import { type Ledger, ledgerFailure } from "../store"
import { type FieldMap, query } from "./errors"
import type { AccountIndex } from "./rows"

/** Where the core names the sum across accounts; a refusal here leaves every Leaf Balance stated. */
const TOTAL_FIELD = "netWorth.totals["

/** A refusal of the net-worth total alone: every account is in range, their sum is not (ADR-0078). */
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
 * Runs one net-worth read. A refusal of the total (the sum of the accounts leaves the safe
 * range) comes back as `TotalRefused`; any other refusal, an account's own overflow included,
 * is the call's error as before.
 */
export function netWorthRead(
	work: () => NetWorth,
	fields: FieldMap,
): NetWorth | TotalRefused | AppError {
	try {
		return work()
	} catch (error) {
		if (!(error instanceof LedgerValidationError)) throw error
		const refusal = ledgerFailure(error, fields(error.field))
		return error.field.startsWith(TOTAL_FIELD) ? { totalRefused: refusal } : refusal
	}
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

export const totalRefusal: z.ZodType<TotalRefusal> = z
	.strictObject({
		code: z.string().describe("The code the total's refusal has: AMOUNT_OVERFLOW."),
		exitCode: z
			.number()
			.int()
			.describe("The exit code the same refusal would give as the call's own."),
		message: z.string(),
		path: z.string().optional(),
		hint: z.string().optional(),
		details: z.unknown().optional(),
	})
	.describe("Why the total is not stated, in the fields of an error envelope.")

/**
 * The human sentence for a result whose total is refused, in place of the total's line. JSON carries
 * the refusal; a person at a terminal reads that every account is stated and the sum is not.
 */
export function totalSentence(): string {
	return "not stated: every account is in range, but their sum exceeds the safe integer range; each account's balance above is stated"
}

function isRefusal(value: unknown): value is TotalRefusal {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as Record<string, unknown>)["message"] === "string"
	)
}

/**
 * The human presentation of a result whose total is refused: the total's line states that it is not
 * stated and why, and the refusal's own fields stay in JSON. A result whose total is stated is
 * printed as it is.
 */
export function totalDisplay(
	totalKey: "totals" | "netWorth",
	errorKey: "totalsError" | "netWorthError",
): (data: Record<string, unknown>) => Record<string, unknown> {
	return (data) => {
		const refusal = data[errorKey]
		if (!isRefusal(refusal)) return data
		const { [errorKey]: _refusal, ...rest } = data
		return { ...rest, [totalKey]: totalSentence() }
	}
}
