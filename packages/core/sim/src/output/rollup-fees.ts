import type { DayTotals } from "../engine/occurrence"
import type { AccountAmount } from "../types/projection"
import type { Period } from "./periods"

/** What each fee Account was charged within `period`, both ends inclusive, in the order given (ADR 0028). */
export function accountFees(
	totals: readonly DayTotals[],
	period: Period,
	accounts: readonly string[],
): readonly AccountAmount[] {
	const charged = new Map<string, bigint>()
	for (const total of totals) {
		if (total.date < period.from || total.date > period.to) continue
		for (const [account, amount] of total.feesBy) {
			charged.set(account, (charged.get(account) ?? 0n) + amount)
		}
	}
	return accounts.map((account) => ({ account, amount: Number(charged.get(account) ?? 0n) }))
}
