import type { ChartOfAccounts } from "./chart-map"
import { parseISODate } from "./date"
import { LedgerValidationError } from "./errors"
import { accountId as toAccountId } from "./ids"
import { scanLedger } from "./ledger-scan"
import { toSafeAmount } from "./safe-amount"
import type { Transaction } from "./transaction"

/** One Leaf Account's Balance on any date, from one read of the Ledger. */
export interface BalanceHistory {
	/**
	 * The Leaf Account's Balance up to and including `asOf`, as `balance` gives it, plus `plus`: the
	 * Minor Units of Postings the Ledger read does not hold. `plus` is a bigint so that the sum is
	 * checked once, and `AMOUNT_OVERFLOW` is thrown for the whole of it as `balance` would.
	 */
	readonly at: (accountId: string, asOf: string, plus?: bigint) => number
}

/** The Postings of one Account by date, with the running sum up to each. */
type Series = { readonly dates: readonly string[]; readonly sums: readonly bigint[] }

const seriesOf = (rows: readonly { date: string; amount: number }[]): Series => {
	const sorted = [...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
	let sum = 0n
	return {
		dates: sorted.map((row) => row.date),
		sums: sorted.map((row) => {
			sum += BigInt(row.amount)
			return sum
		}),
	}
}

/** The running sum up to and including `cutoff`: the last row whose date is not after it. */
const sumUpTo = (series: Series, cutoff: string): bigint => {
	let low = 0
	let high = series.dates.length
	while (low < high) {
		const mid = (low + high) >> 1
		if (series.dates[mid]! <= cutoff) low = mid + 1
		else high = mid
	}
	return low === 0 ? 0n : series.sums[low - 1]!
}

/**
 * Reads the Ledger once and answers `balance` for any Leaf Account and date from that read, so a
 * caller that asks many times pays for the scan once rather than once per question. Every answer
 * equals `balance(transactions, accountId, asOf, chart)`, errors included, and a Ledger the scan
 * refuses is refused here, at the first read.
 */
export const balanceHistory = (
	transactions: readonly Transaction[],
	chart: ChartOfAccounts,
): BalanceHistory => {
	const byAccount = new Map<string, { date: string; amount: number }[]>()
	for (const { account, posting, date } of scanLedger(transactions, chart)) {
		const rows = byAccount.get(account.id) ?? []
		rows.push({ date, amount: posting.amount })
		byAccount.set(account.id, rows)
	}
	const series = new Map<string, Series>()
	return {
		at: (accountId, asOf, plus = 0n) => {
			const id = toAccountId(accountId)
			if (!chart.has(id)) {
				throw new LedgerValidationError(
					"UNKNOWN_ACCOUNT",
					"accountId",
					accountId,
					"is not in the chart of accounts",
				)
			}
			if (!chart.isLeaf(id)) {
				throw new LedgerValidationError(
					"NON_LEAF_ACCOUNT",
					"accountId",
					accountId,
					"is a header account",
				)
			}
			const cutoff = parseISODate(asOf, "asOf")
			let own = series.get(id)
			if (own === undefined) {
				own = seriesOf(byAccount.get(id) ?? [])
				series.set(id, own)
			}
			return toSafeAmount(sumUpTo(own, cutoff) + plus, "balance.amount")
		},
	}
}
