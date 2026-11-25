import type { ChartOfAccounts } from "./chart-map"
import type { Transaction } from "./transaction"
import { type TrialBalanceRow, trialBalanceRows } from "./trial-balance"

/**
 * Whether each `(Entity, Currency)` pair's Debit column equals its Credit column, summed exactly
 * in `BigInt`. Unlike `trialBalance`, it never states a total, so it still answers when a column's
 * sum leaves the safe range though every row is inside it.
 */
export const columnsAgree = (rows: readonly TrialBalanceRow[]): boolean => {
	const gaps = new Map<string, bigint>()
	for (const { entityId, currency, debit, credit } of rows) {
		const key = JSON.stringify([entityId, currency])
		gaps.set(key, (gaps.get(key) ?? 0n) + BigInt(debit) - BigInt(credit))
	}
	return [...gaps.values()].every((gap) => gap === 0n)
}

/**
 * Whether the Trial Balance at `asOf` balances: every pair's columns agree. A row outside the safe
 * range is refused as in `trialBalanceRows`; a column sum outside it is not an error here.
 */
export const trialBalanceAgrees = (
	transactions: readonly Transaction[],
	asOf: string,
	chart: ChartOfAccounts,
): boolean => columnsAgree(trialBalanceRows(transactions, asOf, chart))
