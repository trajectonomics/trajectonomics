/** TEST-ONLY builders for an Account that carries a fee (ADR 0028). */
import type { Account, AssetRule, Fee } from "../types"
import type { Setup } from "./test-helpers"

export const CASH: Account = { id: "cash", kind: "asset", rate: 0 }

/** A fund that charges 150 bps a year, rounded half up, unless `fee` says otherwise. */
export function fund(fee: Partial<Fee> = {}, rest: Partial<AssetRule> = {}): AssetRule {
	return {
		id: "fund",
		kind: "asset",
		rate: 0,
		fee: { bps: 150, rounding: "halfUp", ...fee },
		...rest,
	}
}

/** A Setup of cash and the given Accounts over 2026, the fund holding 1,000,000,000. */
export function chargingSetup(accounts: readonly Account[], extra: Partial<Setup> = {}): Setup {
	return {
		accounts: [CASH, ...accounts],
		balances: { cash: 0, fund: 1_000_000_000 },
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2026-12-31",
		resolution: "day",
		...extra,
	}
}
