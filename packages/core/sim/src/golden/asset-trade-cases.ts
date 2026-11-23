import { purchase, saleOfAll, withdrawal } from "../engine/test-assets"
import { expense, income } from "../engine/test-flows"
import { emptyCarryIn, makeFixture, withCarryIn } from "../engine/test-helpers"
import type { Account, Levy, Milestone } from "../types"
import type { ParityCase } from "./parity-cases"

const cash: Account = { id: "cash", kind: "asset", rate: 0 }
const home: Account = { id: "home", kind: "asset", rate: 0, liquid: false }
const mortgage: Account = { id: "mortgage", kind: "liability", rate: 0 }
const monthly = { frequency: "monthly", start: "2026-01-01" } as const
const ON = { start: "2026-02-01" } as const
const DAY = { start: "2026-01-31", horizon: "2026-02-02", resolution: "day" } as const

/** A 3,000,000.00 home bought with a 2,400,000.00 loan drawn the same day: only the deposit leaves cash. */
const buyWithLoan = makeFixture({
	accounts: [cash, home, mortgage],
	balances: { cash: 60_000_000 },
	flows: [
		withdrawal("draw", "mortgage", 240_000_000, ON),
		purchase("buy", "home", 300_000_000, ON),
	],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	...DAY,
})

/** The same purchase with 1,000,000.00 anywhere: a Shortfall of 2,000,000.00 on the day. */
const buyShortfall = makeFixture({
	accounts: [cash, home],
	balances: { cash: 100_000_000 },
	flows: [purchase("buy", "home", 300_000_000, ON)],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	...DAY,
})

const gains: Levy = {
	id: "gains",
	period: { month: 1, day: 1 },
	settlement: { month: 3, day: 31 },
	measures: [
		{ id: "gain", op: "tally", label: "gain", basis: "gains" },
		{ id: "zero", op: "const", value: 0 },
	],
	due: "zero",
}

/** A 5,000,000.00 home on a 4,000,000.00 basis, sold whole: a Realised gain of 1,000,000.00. */
const sellForGain = makeFixture({
	accounts: [cash, { ...home, gainLabel: "gain" }],
	balances: { cash: 0, home: 500_000_000 },
	basis: { home: 400_000_000 },
	flows: [saleOfAll("sell", "home", { start: "2026-06-01" })],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	start: "2026-05-31",
	horizon: "2026-06-02",
	resolution: "day",
	levy: withCarryIn(gains, emptyCarryIn("2026-01-01")),
})

/** A 10,000,000 home sold on a fixed date, funding an earlier FI month than keeping it. */
const sellToRetire = makeFixture({
	accounts: [cash, home],
	balances: { cash: 5_000_000, home: 10_000_000 },
	flows: [
		income("salary", 1_000_000, monthly),
		income("rent", 300_000, { ...monthly, earned: false }),
		expense("living", 600_000, monthly),
		saleOfAll("sell", "home", { start: "2026-01-01", startAt: "later" }),
	],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	start: "2026-01-01",
	horizon: "2034-01-01",
	resolution: "month",
})
const later: Milestone = {
	id: "later",
	combine: "all",
	criteria: [{ id: "d", kind: "date", on: "2027-07-01" }],
}

export const ASSET_TRADE_PARITY_CASES: readonly ParityCase[] = [
	{ name: "buy-home-loan-day", fixture: buyWithLoan },
	{ name: "buy-home-shortfall-day", fixture: buyShortfall },
	{ name: "sell-home-gain-day", fixture: sellForGain },
	{
		name: "sell-home-fi",
		fixture: { ...sellToRetire, scenario: { ...sellToRetire.scenario, milestones: [later] } },
		options: { method: "survival", minBufferMonths: 6 },
	},
]
