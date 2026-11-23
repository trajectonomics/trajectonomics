import { describe, expect, it } from "bun:test"
import type { Account, Flow } from "../types"
import { project } from "./project"
import { purchase, withdrawal } from "./test-assets"
import { contribution, income } from "./test-flows"
import { amounts, makeFixture, rowAt, run, type Setup } from "./test-helpers"

const cash: Account = { id: "cash", kind: "asset", rate: 0 }
const savings: Account = { id: "savings", kind: "asset", rate: 0 }
const home: Account = { id: "home", kind: "asset", rate: 0, liquid: false }
const mortgage: Account = { id: "mortgage", kind: "liability", rate: 0 }

const DAY = { start: "2026-01-01", horizon: "2026-02-02", resolution: "day" } as const
const ON = { start: "2026-02-01" } as const

function buying(setup: Pick<Setup, "accounts" | "balances" | "flows"> & Partial<Setup>) {
	return run({ surplus: [{ account: "cash" }], withdraw: ["cash"], ...DAY, ...setup })
}

describe("a purchase is an obligation Contribution paid in full", () => {
	// 3,000,000.00 home, 600,000.00 cash, 2,400,000.00 borrowed the same day: the loan cash comes in
	// first, so the deposit is all that leaves savings, and nothing is short.
	it("with a loan draw on the date, pays only the deposit from savings: no Shortfall", () => {
		const projection = buying({
			accounts: [cash, home, mortgage],
			balances: { cash: 60_000_000 },
			flows: [
				withdrawal("draw", "mortgage", 240_000_000, ON),
				purchase("buy", "home", 300_000_000, ON),
			],
		})
		expect(amounts(rowAt(projection, "2026-02-01"))).toEqual({
			cash: 0,
			home: 300_000_000,
			mortgage: 240_000_000,
		})
		expect(projection.runsOut).toBeUndefined()
		const [year] = projection.annual
		expect([year?.contributions, year?.unfundedContributions, year?.withdrawals]).toEqual([
			300_000_000, 0, 240_000_000,
		])
	})

	it("with no loan, is drawn from the withdraw list in order: 100,000.00 cash, then 2,000,000.00 savings", () => {
		const projection = buying({
			accounts: [cash, savings, home],
			balances: { cash: 100_000_000, savings: 250_000_000 },
			flows: [purchase("buy", "home", 300_000_000, ON)],
			withdraw: ["cash", "savings"],
		})
		expect(amounts(rowAt(projection, "2026-02-01"))).toEqual({
			cash: 0,
			savings: 50_000_000,
			home: 300_000_000,
		})
		expect(projection.runsOut).toBeUndefined()
	})

	// Only 1,000,000.00 anywhere: 2,000,000.00 of the price is a Shortfall on that date. The purchase
	// is booked in full, as a debt payment is, and the run ends there.
	it("with too little anywhere, is a Shortfall on that date and is still booked in full", () => {
		const projection = buying({
			accounts: [cash, home],
			balances: { cash: 100_000_000 },
			flows: [purchase("buy", "home", 300_000_000, ON)],
		})
		expect(projection.runsOut).toEqual({ date: "2026-02-01", unmet: 200_000_000 })
		expect(amounts(rowAt(projection, "2026-02-01"))).toEqual({ cash: 0, home: 300_000_000 })
	})

	it("is not routed: the home need not be in cashflow.contribute", () => {
		const { baseline, scenario, timeline } = makeFixture({
			accounts: [cash, home],
			balances: { cash: 300_000_000 },
			flows: [purchase("buy", "home", 300_000_000, ON)],
			surplus: [{ account: "cash" }],
			contribute: [],
			withdraw: ["cash"],
			...DAY,
		})
		expect(project(baseline, scenario, timeline).ok).toBe(true)
	})

	it("sums same-date obligations into one Account", () => {
		const projection = buying({
			accounts: [cash, home],
			balances: { cash: 100_000_000 },
			flows: [
				purchase("deposit", "home", 10_000_000, ON),
				purchase("fees", "home", 20_000_000, ON),
			],
		})
		expect(amounts(rowAt(projection, "2026-02-01"))).toEqual({ cash: 70_000_000, home: 30_000_000 })
	})
})

describe("an obligation and a target Contribution on one date", () => {
	const flows = (pay: number): readonly Flow[] => [
		income("pay", pay, ON),
		purchase("buy", "home", 30_000_000, ON),
		contribution("save", "savings", 40_000_000, ON),
	]
	const accounts = [cash, savings, home]

	// Income 50,000,000 − obligation 30,000,000 leaves 20,000,000: the target gets that, 20,000,000
	// is unfunded, and no cash is left over.
	it("funds the target only from what the obligation leaves of the day's income", () => {
		const projection = buying({
			accounts,
			balances: { cash: 0 },
			flows: flows(50_000_000),
			contribute: ["savings"],
		})
		expect(amounts(rowAt(projection, "2026-02-01"))).toEqual({
			cash: 0,
			savings: 20_000_000,
			home: 30_000_000,
		})
		const [year] = projection.annual
		expect([year?.contributions, year?.unfundedContributions]).toEqual([50_000_000, 20_000_000])
	})

	// Income 10,000,000 is below the obligation: no Available cashflow, the target is wholly unfunded,
	// and the 20,000,000 gap is drawn from cash.
	it("leaves the target wholly unfunded when the obligation uses the whole income", () => {
		const projection = buying({
			accounts,
			balances: { cash: 100_000_000 },
			flows: flows(10_000_000),
			contribute: ["savings"],
		})
		expect(amounts(rowAt(projection, "2026-02-01"))).toEqual({
			cash: 80_000_000,
			savings: 0,
			home: 30_000_000,
		})
		expect(projection.annual[0]?.unfundedContributions).toBe(40_000_000)
	})
})
