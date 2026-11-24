import { statedAmount } from "./account"
import { assertSafeInteger } from "./amount"
import type { ChartOfAccounts } from "./chart-map"
import { accountId } from "./ids"
import type { LegInput } from "./legs"
import { assertSameCurrency, credited, legPosting } from "./legs"
import { toSafeAmount } from "./safe-amount"
import type { Transaction } from "./transaction"
import { validateTransaction } from "./transaction"

const idOf = (leg: LegInput): string => (typeof leg === "string" ? leg : leg.accountId)

/** What a Valuation entry says: the entry (absent when nothing moves) and the figures it states. */
export type Valuation = {
	/** The Simple Entry, or `undefined` when the Balance already is the value. */
	readonly transaction: Transaction | undefined
	/** The account's value before the entry, on its Normal Balance side. */
	readonly before: number
	/** `value` minus `before`, on the same side; zero when nothing moves. */
	readonly difference: number
}

/**
 * Build a Valuation entry: the Simple Entry that moves `account` from its `balance` to the stated
 * `value` on `date`, posted against `against`, with no entry when they already agree.
 *
 * `balance` is the account's signed Balance at `date` (Debit positive), which the caller read.
 * `value` is stated on the account's Normal Balance side: the Debit balance of an asset, the
 * amount owed on a liability. Both are safe integers of Minor Units; `before` and `difference` come
 * back on that same side, and the Posting signs are derived here, so no sign is the caller's to get
 * wrong. The legs are checked even when nothing is written, so a Currency mismatch is refused
 * whether or not the figures agree.
 */
export const valuationEntry = (
	input: {
		readonly id: string
		readonly date: string
		readonly account: LegInput
		readonly against: LegInput
		readonly balance: number
		readonly value: number
	},
	chart: ChartOfAccounts,
): Valuation => {
	const balance = assertSafeInteger(input.balance, "balance")
	const value = assertSafeInteger(input.value, "value")
	const account = legPosting(input.account, 0, chart, "account")
	const against = legPosting(input.against, 0, chart, "against")
	assertSameCurrency([account, against], ["account", "against"])
	const type = chart.get(accountId(idOf(input.account)))!.type
	const before = statedAmount(type, balance)
	const difference = toSafeAmount(BigInt(value) - BigInt(before), "value")
	if (difference === 0) return { transaction: undefined, before, difference }
	const moved = statedAmount(type, difference)
	const transaction = validateTransaction(
		{
			id: input.id,
			date: input.date,
			postings: [
				{ ...account, amount: moved },
				{ ...against, amount: credited(moved) },
			],
		},
		chart,
	)
	return { transaction, before, difference }
}
