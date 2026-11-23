import type { Account, DateString } from "../types"

/**
 * Whether an Account's value is left out of Accessible net worth on `date`: an asset still locked
 * on `date`, or an asset marked `liquid: false`. A liability is never left out.
 */
export function leftOutOfAccessible(rule: Account | undefined, date: DateString): boolean {
	if (rule?.kind !== "asset") return false
	if (rule.liquid === false) return true
	return rule.lockedUntil !== undefined && date < rule.lockedUntil
}
