import { expense } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import type { ReturnModel } from "../types"

const HALF = 2147483648

/** Two buckets over two Accounts: a good month for the fund and bond, and a bad one for both. */
export const twoBuckets: ReturnModel = {
	id: "two-buckets",
	accounts: ["fund", "bond"],
	buckets: [
		{ returnsBps: [1000, 100], weight: HALF },
		{ returnsBps: [-2000, -50], weight: HALF },
	],
}

/** 5,000 of savings drawn down by 150 a month for three years: some paths run out, some do not. */
export const drawdown: Fixture = makeFixture({
	accounts: [
		{ id: "fund", kind: "asset", rate: 0 },
		{ id: "bond", kind: "asset", rate: 0 },
	],
	balances: { fund: 3_000, bond: 2_000 },
	flows: [expense("living", 150, { start: "2026-01-31", frequency: "monthly" })],
	surplus: [{ account: "fund" }],
	withdraw: ["fund", "bond"],
	horizon: "2029-01-01",
	resolution: "month",
})

/** The same account pair on a Timeline whose roll-ups are whole calendar years. */
export const calendarYears: Fixture = makeFixture({
	accounts: [
		{ id: "fund", kind: "asset", rate: 0 },
		{ id: "bond", kind: "asset", rate: 0 },
	],
	balances: { fund: 100_000, bond: 100_000 },
	surplus: [{ account: "fund" }],
	horizon: "2029-01-01",
	resolution: "month",
})
