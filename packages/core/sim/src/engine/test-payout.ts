/** TEST-ONLY builders for an Account that pays out (ADR 0027). */
import type { Account, AssetRule, Payout, Projection, Scenario } from "../types"
import type { ProjectionOptions } from "../types/statement"
import { project } from "./project"
import { amounts, makeFixture, type Setup } from "./test-helpers"

export const CASH: Account = { id: "cash", kind: "asset", rate: 0 }

/** A fund that pays 400 bps a year quarterly, rounded half up, unless `payout` says otherwise. */
export function fund(payout: Partial<Payout> = {}, rest: Partial<AssetRule> = {}): AssetRule {
	return {
		id: "fund",
		kind: "asset",
		rate: 0,
		payout: { bps: 400, frequency: "quarterly", rounding: "halfUp", ...payout },
		...rest,
	}
}

/** A Setup of cash and the given Accounts, every payout landing in cash. */
export function payingSetup(accounts: readonly Account[], extra: Partial<Setup> = {}): Setup {
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

/** The Projection of a Setup, with the options; a refusal throws. */
export function projected(
	setup: Setup,
	options: ProjectionOptions = {},
	scenarioFields: Partial<Scenario> = {},
): Projection {
	const { baseline, scenario, timeline } = makeFixture(setup)
	const result = project(baseline, { ...scenario, ...scenarioFields }, timeline, options)
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.projection
}

/** The dates in a day-by-day Projection on which `account` went up: the dates cash arrived. */
export function risesOf(projection: Projection, account: string): readonly string[] {
	const values = projection.rows.map((row) => amounts(row)[account] ?? 0)
	return projection.rows
		.filter((_row, index) => (values[index] ?? 0) > (values[index - 1] ?? 0))
		.map((row) => row.date)
}
