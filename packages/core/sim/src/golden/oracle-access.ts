import type { Account, DateString } from "../types"

/**
 * Whether an Account's value is left out of accessible net worth on `date` (ADR 0019): an asset
 * still locked on `date`, or an asset marked `liquid: false`. Written from the plain Scenario field,
 * with no engine import, so the oracle decides it independently of `engine/accessible.ts`.
 */
export function oracleLeftOut(rule: Account, date: DateString): boolean {
	if (rule.kind !== "asset") return false
	if (rule.liquid === false) return true
	return rule.lockedUntil !== undefined && date < rule.lockedUntil
}

/** The asset Accounts marked `liquid: false` in a Scenario. */
function oracleMarked(accounts: readonly Account[]): readonly Account[] {
	return accounts.filter((rule) => rule.kind === "asset" && rule.liquid === false)
}

/** The ids of the Accounts marked `liquid: false` in a Scenario. */
export function oracleMarkedIds(accounts: readonly Account[]): ReadonlySet<string> {
	return new Set(oracleMarked(accounts).map((rule) => rule.id))
}
