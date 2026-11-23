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
