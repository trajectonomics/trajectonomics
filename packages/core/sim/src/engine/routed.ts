import { growthYears } from "../calendar/arith"
import type { Inflation } from "../money/inflation"
import type { AccountId, DateString, RoutedAmount, WithdrawEntry } from "../types"
import { grownAmount } from "./amount"
import { isSafeInteger } from "./overflow"
import type { AccountState } from "./state"

/**
 * What a routing target is worth on `date`, exactly: a number as it is, `{ amount, growth }` grown by
 * the whole years since `timelineStart` with the engine's one half-up rounding, as a spending rule's
 * floor is. The one path the engine's `routedAt` and the public `routedTargetAt` both read.
 */
export function routedValue(
	target: RoutedAmount,
	timelineStart: DateString,
	date: DateString,
	inflation: Inflation,
): bigint {
	if (typeof target === "number") return BigInt(target)
	const years = growthYears(timelineStart, date)
	return grownAmount(target.amount, target.growth, years, inflation, date)
}

/**
 * The amount a routing target is in force at on `date`, in minor units: a number is itself, and
 * `{ amount, growth }` is `amount` grown by the whole years since `timelineStart` (ADR 0030). Pure.
 * Throws a `RangeError` for a value beyond the safe integers, which a `number` cannot hold exactly.
 */
export function routedTargetAt(
	target: RoutedAmount,
	timelineStart: DateString,
	date: DateString,
	inflation: number,
): number {
	const value = routedValue(target, timelineStart, date, inflation)
	if (!isSafeInteger(value)) throw new RangeError(`the target on ${date} is beyond 2^53: ${value}`)
	return Number(value)
}

/** What a routing target is worth on `date` for the engine: `routedValue` from the Account's Timeline start. */
export function routedAt(
	target: RoutedAmount,
	state: AccountState,
	date: DateString,
	inflation: Inflation,
): bigint {
	return routedValue(target, state.opened, date, inflation)
}

/** The Account a withdrawal entry draws, whether it carries a floor or not. */
export function entryAccount(entry: WithdrawEntry): AccountId {
	return typeof entry === "string" ? entry : entry.account
}
