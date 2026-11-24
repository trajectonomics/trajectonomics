import { expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import { transfer, transferAll, transferShare } from "../engine/test-transfer"
import type { Fixture } from "../fixtures/fixture"
import type { Account } from "../types"

const cash: Account = { id: "cash", kind: "asset", rate: 0 }
const savings: Account = { id: "savings", kind: "asset", rate: 200 }
const deposit: Account = { id: "deposit", kind: "asset", rate: 150 }
const pvd: Account = { id: "pvd", kind: "asset", rate: 300 }
const rmf: Account = { id: "rmf", kind: "asset", rate: 300, lockedUntil: "2032-01-01" }

const THREE_YEARS = { start: "2026-01-01", horizon: "2028-12-31", resolution: "month" } as const
const salary = income("pay", 100_000, { frequency: "monthly", start: "2026-01-01" })
const living = expense("living", 60_000, { frequency: "monthly", start: "2026-01-01" })

/** A provident fund of 3,000,000 at 3 per cent rolled whole into a locked RMF on 30 June 2027, beside a salary and living. */
export const transferRollover: Fixture = makeFixture({
	accounts: [cash, pvd, rmf],
	balances: { pvd: 3_000_000 },
	flows: [salary, living, transferAll("roll", "pvd", "rmf", { start: "2027-06-30" })],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	...THREE_YEARS,
})

/** A tenth of savings moved to a fixed deposit every 1 January, and a fixed 20,000 on the 15th of each quarter. */
export const transferShares: Fixture = makeFixture({
	accounts: [cash, savings, deposit],
	balances: { savings: 2_000_000, deposit: 100_000 },
	flows: [
		salary,
		living,
		transferShare("tenth", "savings", "deposit", { num: 1, den: 10 }, { frequency: "annual" }),
		transfer("quarter", "deposit", "savings", 20_000, {
			frequency: "quarterly",
			start: "2026-02-15",
		}),
	],
	surplus: [{ account: "cash" }],
	withdraw: ["cash", "savings"],
	...THREE_YEARS,
})

const loan: Account = { id: "loan", kind: "liability", rate: 600, compounding: "monthly" }

/** A 400,000 loan at 6 per cent nominal, paid 50,000 a month from savings until nothing is owed, then moving nothing. */
export const transferLoan: Fixture = makeFixture({
	accounts: [cash, savings, loan],
	balances: { savings: 1_000_000, loan: 400_000 },
	flows: [
		salary,
		living,
		transfer("pay-down", "savings", "loan", 50_000, { frequency: "monthly", start: "2026-01-31" }),
	],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	...THREE_YEARS,
})

/** Savings of 100,000 asked for 60,000 a month: the second month moves 40,000 and every later one nothing. */
export const transferShort: Fixture = makeFixture({
	accounts: [cash, savings, deposit],
	balances: { savings: 100_000 },
	flows: [
		salary,
		living,
		transfer("drip", "savings", "deposit", 60_000, { frequency: "monthly", start: "2026-01-01" }),
	],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	...THREE_YEARS,
})

function withMilestone(fixture: Fixture): Fixture {
	const later = {
		id: "later",
		combine: "all",
		criteria: [{ id: "d", kind: "date", on: "2027-07-01" }],
	} as const
	return { ...fixture, scenario: { ...fixture.scenario, milestones: [later] } }
}

/** 6,000,000 of the 5,000,000 plus 700,000 a month locked into an RMF when a Milestone fires on 1 July 2027: FI moves with it. */
export const transferLocked: Fixture = withMilestone(
	makeFixture({
		accounts: [cash, { id: "rmf", kind: "asset", rate: 0, lockedUntil: "2040-01-01" }],
		balances: { cash: 5_000_000 },
		flows: [
			income("salary", 1_000_000, { frequency: "monthly", start: "2026-01-01" }),
			income("rent", 300_000, { frequency: "monthly", start: "2026-01-01", earned: false }),
			expense("living", 600_000, { frequency: "monthly", start: "2026-01-01" }),
			transfer("lock", "cash", "rmf", 6_000_000, { start: "2026-01-01", startAt: "later" }),
		],
		surplus: [{ account: "cash" }],
		withdraw: ["cash", "rmf"],
		start: "2026-01-01",
		horizon: "2034-01-01",
		resolution: "month",
	}),
)
