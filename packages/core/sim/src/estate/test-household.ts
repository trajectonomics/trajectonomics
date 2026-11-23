import { income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import type { Account, Estate, Scenario } from "../types"

/** A home, a loan, a locked fund and cash, every rate 0, over two years at 3% inflation. */
export const ACCOUNTS: readonly Account[] = [
	{ id: "cash", kind: "asset", rate: 0 },
	{ id: "home", kind: "asset", rate: 0, liquid: false },
	{ id: "fund", kind: "asset", rate: 0, lockedUntil: "2030-01-01" },
	{ id: "loan", kind: "liability", rate: 0 },
]

export const BALANCES = { cash: 1_000_000, home: 5_000_000, fund: 2_000_000, loan: 3_000_000 }

/** The plan without an estate block: month rows, so 2027-01-01 and 2028-01-01 are whole years in. */
export function household(balances: Record<string, number> = BALANCES): Fixture {
	return makeFixture({
		accounts: ACCOUNTS,
		balances,
		surplus: [{ account: "cash" }],
		inflation: 300,
		start: "2026-01-01",
		horizon: "2028-01-01",
		resolution: "month",
	})
}

export function withEstate(fixture: Fixture, estate: Estate): Fixture {
	const scenario: Scenario = { ...fixture.scenario, estate }
	return { ...fixture, scenario }
}

/** Accounts that earn and a loan that costs interest, so every part of every row rounds on its own. */
export const GROWING: readonly Account[] = [
	{ id: "cash", kind: "asset", rate: 437 },
	{ id: "home", kind: "asset", rate: 211, liquid: false },
	{ id: "fund", kind: "asset", rate: 613, lockedUntil: "2040-01-01" },
	{ id: "loan", kind: "liability", rate: 517 },
]

/** The growing household over 60 years of month rows at 3.17% inflation; with `repaid`, pay lands in cash and 40,000 a month repays the loan. */
export function growingHousehold(repaid = false): Fixture {
	return makeFixture({
		accounts: GROWING,
		balances: { cash: 1_000_003, home: 5_000_007, fund: 2_000_011, loan: 3_000_013 },
		flows: repaid
			? [
					income("pay", 90_001, { frequency: "monthly", start: "2026-01-31" }),
					{
						id: "repay",
						kind: "contribution",
						target: "loan",
						amount: 40_000,
						frequency: "monthly",
						start: "2026-01-31",
						growth: { bps: 0 },
					},
				]
			: [],
		surplus: [{ account: "cash" }],
		inflation: 317,
		start: "2026-01-01",
		horizon: "2086-01-01",
		resolution: "month",
	})
}
