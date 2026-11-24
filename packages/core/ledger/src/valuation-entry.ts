import { normalBalance } from "./account"
import { assertSafeInteger } from "./amount"
import type { ChartOfAccounts } from "./chart-map"
import { accountId } from "./ids"
import type { LegInput } from "./legs"
import { assertSameCurrency, credited, legPosting } from "./legs"
import { toSafeAmount } from "./safe-amount"
import type { Transaction } from "./transaction"
import { validateTransaction } from "./transaction"

const idOf = (leg: LegInput): string => (typeof leg === "string" ? leg : leg.accountId)

/**
 * Build a Valuation entry: the Simple Entry that moves `account` from its `balance` to the stated
 * `value` on `date`, posted against `against`, or `undefined` when they already agree.
 *
 * `balance` is the account's signed Balance at `date` (Debit positive), which the caller read.
 * `value` is stated on the account's Normal Balance side: the Debit balance of an asset, the
 * amount owed on a liability. Both are safe integers of Minor Units; the difference is derived
 * here, so its sign is never the caller's to get wrong. The legs are checked even when nothing is
 * written, so a Currency mismatch is refused whether or not the figures agree.
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
): Transaction | undefined => {
	const balance = assertSafeInteger(input.balance, "balance")
	const value = assertSafeInteger(input.value, "value")
	const account = legPosting(input.account, 0, chart, "account")
	const against = legPosting(input.against, 0, chart, "against")
	assertSameCurrency([account, against], ["account", "against"])
	const type = chart.get(accountId(idOf(input.account)))!.type
	const target = normalBalance(type) === "debit" ? value : 0 - value
	const difference = toSafeAmount(BigInt(target) - BigInt(balance), "value")
	if (difference === 0) return undefined
	return validateTransaction(
		{
			id: input.id,
			date: input.date,
			postings: [
				{ ...account, amount: difference },
				{ ...against, amount: credited(difference) },
			],
		},
		chart,
	)
}
