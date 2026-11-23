import { expense, income, prepays } from "../engine/test-flows"
import { makeFixture, withCarryIn } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import type { Levy } from "../types"

/**
 * A leap-day Shortfall. 2028 is a leap year. Bonus 400 on 31 January, pay 100 on 29 February, and rent
 * 300 monthly from 31 January, so it lands on 31 January, 29 February, 31 March and 30 April. Cash
 * starts at 0 and is the only Account, so it is both the surplus and the withdrawal.
 * Hand: 31 January nets 400 − 300 = +100, so cash ends at 100. 29 February nets 100 − 300 = −200;
 * `withdraw` takes all 100 of cash (drawn 100) and 100 stays unmet, so the run ends on 29 February.
 * Year 2028 to 29 February: income 500 (bonus 400, pay 100), expenses 600 (rent twice), drawn 100,
 * surplus 100, unmet 100. Identity: 500 + 100 + 100 = 700 = 600 + 100.
 */
export const leapShortfall: Fixture = makeFixture({
	accounts: [{ id: "cash", kind: "asset", rate: 0 }],
	balances: { cash: 0 },
	flows: [
		income("bonus", 400, { start: "2028-01-31" }),
		income("pay", 100, { start: "2028-02-29" }),
		expense("rent", 300, { frequency: "monthly", start: "2028-01-31" }),
	],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	start: "2028-01-01",
	horizon: "2028-12-31",
	resolution: "month",
})

/** Two Levies on one salary: a plain 10% Prepayment, and a 5% Prepayment capped at 55,000,000 of gross. */
const PLAIN_LEVY: Levy = {
	id: "plain",
	period: { month: 1, day: 1 },
	settlement: { month: 3, day: 31 },
	measures: [{ id: "owed", op: "const", value: 9_000_000 }],
	due: "owed",
}

const CAPPED_LEVY: Levy = {
	id: "capped",
	period: { month: 1, day: 1 },
	settlement: { month: 3, day: 31 },
	measures: [
		{ id: "base", op: "const", value: 55_000_000 },
		{ id: "owed", op: "const", value: 5_000_000 },
	],
	due: "owed",
}

/**
 * Salary 10,000,000 monthly from 31 January 2026. The plain Levy takes 10% of each salary and owes
 * 9,000,000 a year; the capped Levy takes 5% of the gross below 55,000,000 of each calendar year and owes
 * 5,000,000. Both settle on 31 March of the next year, inside the horizon.
 */
export const twoLevies: Fixture = makeFixture({
	accounts: [{ id: "cash", kind: "asset", rate: 0 }],
	balances: { cash: 0 },
	flows: [
		income("salary", 10_000_000, {
			frequency: "monthly",
			start: "2026-01-31",
			label: "salary",
			prepayments: prepays("plain", 1000),
			cappedPrepayment: { levy: "capped", bps: 500, upTo: "base" },
		}),
	],
	// The 2025 period starts before the Timeline. Its carry-in prepaid equals what it owes, so it settles
	// to zero on 31 March 2026 and the 2026 lines hold only 2026's own figures.
	levies: [
		withCarryIn(PLAIN_LEVY, { periodStart: "2025-01-01", tallies: [], prepaid: 9_000_000 }),
		withCarryIn(CAPPED_LEVY, { periodStart: "2025-01-01", tallies: [], prepaid: 5_000_000 }),
	],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	start: "2026-01-01",
	horizon: "2027-03-31",
	resolution: "month",
})
