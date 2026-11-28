import { expense, income, prepays } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import type { Levy } from "../types"

const CASH = [{ id: "cash", kind: "asset", rate: 0 }] as const
const ROUTED = { surplus: [{ account: "cash" }], withdraw: ["cash"] } as const

/** Case A: a mid-month As-of and horizon, so the first and last months and years are partial. */
export const partialEnds: Fixture = makeFixture({
	accounts: CASH,
	balances: { cash: 0 },
	flows: [
		income("pay", 1000, { frequency: "monthly", start: "2026-11-30" }),
		expense("rent", 600, { frequency: "monthly", start: "2026-12-01" }),
	],
	...ROUTED,
	start: "2026-11-15",
	horizon: "2027-02-10",
})

/** Case B: the Shortfall of 2026-03-10 ends the run, mid-month. */
export const runOutMonth: Fixture = makeFixture({
	accounts: CASH,
	balances: { cash: 1000 },
	flows: [
		expense("rent", 400, { frequency: "monthly", start: "2026-01-10" }),
		income("pay", 100, { start: "2026-03-05" }),
	],
	...ROUTED,
	start: "2026-01-01",
	horizon: "2027-06-30",
})

/** A Levy that owes 9000 every year and settles on 31 March, after the salary year that paid it. */
const PLAIN: Levy = {
	id: "plain",
	period: { month: 1, day: 1 },
	settlement: { month: 3, day: 31 },
	measures: [{ id: "owed", op: "const", value: 9000 }],
	due: "owed",
	carryIn: [{ periodStart: "2025-01-01", tallies: [], prepaid: 7000 }],
}

/** Case C: a Settlement month, a refund, and an April year start. */
export const levyApril: Fixture = makeFixture({
	accounts: CASH,
	balances: { cash: 0 },
	flows: [
		income("salary", 10_000, {
			frequency: "monthly",
			start: "2026-01-31",
			label: "salary",
			prepayments: prepays("plain", 1000),
		}),
	],
	...ROUTED,
	start: "2026-01-01",
	horizon: "2027-04-30",
	levy: PLAIN,
})

/** Case D: the leap day as the As-of, and a March year start whose first year ends on 29 February. */
export const leapDay: Fixture = makeFixture({
	accounts: CASH,
	balances: { cash: 0 },
	flows: [
		income("pay", 100, { start: "2028-02-29" }),
		expense("rent", 30, { frequency: "monthly", start: "2028-02-29" }),
	],
	...ROUTED,
	start: "2028-02-29",
	horizon: "2028-04-15",
})

function shortHorizon(horizon: string): Fixture {
	return makeFixture({
		accounts: CASH,
		balances: { cash: 0 },
		flows: [income("pay", 50, { start: "2026-03-15" })],
		...ROUTED,
		start: "2026-03-10",
		horizon,
	})
}

/** Case E: a horizon under a month. */
export const underAMonth: Fixture = shortHorizon("2026-03-20")

/** Case E's edge: a horizon equal to the As-of. */
export const oneDay: Fixture = shortHorizon("2026-03-10")
