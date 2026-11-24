import { growthYears } from "../calendar/arith"
import type { AccountId, DateString, RoutedAmount, WithdrawEntry } from "../types"
import { grownAmount } from "./amount"
import type { AccountState } from "./state"

/**
 * What a routing target is worth on `date`: a number as it is, `{ amount, growth }` grown by the whole
 * years since the Timeline start with the engine's one half-up rounding, as a spending rule's floor is.
 */
export function routedAt(
	target: RoutedAmount,
	state: AccountState,
	date: DateString,
	inflation: number,
): bigint {
	if (typeof target === "number") return BigInt(target)
	const years = growthYears(state.opened, date)
	return grownAmount(target.amount, target.growth, years, inflation)
}

/** The Account a withdrawal entry draws, whether it carries a floor or not. */
export function entryAccount(entry: WithdrawEntry): AccountId {
	return typeof entry === "string" ? entry : entry.account
}
