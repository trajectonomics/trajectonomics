import { profitAndLossRows } from "@trajectonomics/core/ledger"
import type { AppError } from "../errors"
import { isAppError } from "../errors"
import { type FieldMap, query } from "../report/errors"
import type { Ledger } from "../store"
import { monthEndOf, monthStartOf } from "./rates-window"

/** The core names a row by its Account in brackets; this read names it by id after `rows.`. */
const fieldOf: FieldMap = (field) => field.replace(/^profitAndLoss\.rows\[([^\]]+)\]$/, "rows.$1")

/** One income or expense Account's net sum in each covered month, oldest first, by Account id. */
export type RatesSums = ReadonlyMap<string, readonly bigint[]>

/**
 * Each income and expense Leaf Account's net sum for every covered month, through one core P&L
 * query per month; the core's own rules are never copied. A month whose sum leaves the safe range
 * is refused at `rows.<accountId>`.
 */
export function ratesSumsOf(ledger: Ledger, monthKeys: readonly string[]): RatesSums | AppError {
	const sums = new Map<string, bigint[]>()
	for (const [index, key] of monthKeys.entries()) {
		const rows = query(
			() =>
				profitAndLossRows(
					ledger.transactions,
					{ from: monthStartOf(key), to: monthEndOf(key) },
					ledger.chart,
				),
			fieldOf,
		)
		if (isAppError(rows)) return rows
		for (const row of rows) {
			const values = sums.get(row.accountId) ?? monthKeys.map(() => 0n)
			values[index] = BigInt(row.amount)
			sums.set(row.accountId, values)
		}
	}
	return sums
}
