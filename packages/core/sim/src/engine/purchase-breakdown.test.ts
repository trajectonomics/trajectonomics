import { describe, expect, it } from "bun:test"
import { identitySides, rollupMismatches } from "../golden/cashflow-check"
import type { Account } from "../types"
import { project } from "./project"
import { purchase, withdrawal } from "./test-assets"
import { expense, income } from "./test-flows"
import { makeFixture } from "./test-helpers"

const accounts: readonly Account[] = [
	{ id: "cash", kind: "asset", rate: 0 },
	{ id: "car", kind: "asset", rate: 0, liquid: false },
	{ id: "home", kind: "asset", rate: 0, liquid: false },
	{ id: "mortgage", kind: "liability", rate: 0 },
]

const monthly = { frequency: "monthly", start: "2026-01-01" } as const

/**
 * A hand-worked 2026. Cash 600,000.00 opens; a 200,000.00 salary and a 50,000.00 expense land on the
 * 1st of each month, so each month nets 150,000.00 to surplus.
 * 1 Feb: a 3,000,000.00 car is bought and 2,400,000.00 is borrowed: the net is 150,000.00 − 3,000,000.00
 *   + 2,400,000.00 = −450,000.00, drawn from cash (600,000.00 + 150,000.00 − 450,000.00 = 300,000.00).
 * 1 Jul: 1,500,000.00 of the home is sold, and lands in surplus with that month's 150,000.00.
 * Totals: income 2,400,000.00; withdrawals 2,400,000.00 + 1,500,000.00 = 3,900,000.00; drawn 450,000.00;
 * expenses 600,000.00; contributions applied 3,000,000.00; surplus 11 × 150,000.00 + 1,500,000.00 = 3,150,000.00.
 * Identity: 2,400,000 + 3,900,000 + 450,000 + 0 = 6,750,000 = 600,000 + 3,000,000 + 3,150,000.
 */
describe("the cash-flow breakdown reports a purchase and a sale, and its identity holds", () => {
	const { baseline, scenario, timeline } = makeFixture({
		accounts,
		balances: { cash: 60_000_000, home: 400_000_000 },
		flows: [
			income("salary", 20_000_000, monthly),
			expense("living", 5_000_000, monthly),
			withdrawal("draw", "mortgage", 240_000_000, { start: "2026-02-01" }),
			purchase("buy", "car", 300_000_000, { start: "2026-02-01" }),
			withdrawal("sell", "home", 150_000_000, { start: "2026-07-01" }),
		],
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2026-12-31",
		resolution: "month",
	})

	it("lines each movement and balances to the unit", () => {
		const result = project(baseline, scenario, timeline, { cashflowBreakdown: true })
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		const [line] = result.projection.cashflow ?? []
		expect(line?.contributions).toEqual([
			{ flow: "buy", account: "car", applied: 300_000_000, unfunded: 0 },
		])
		expect(line?.withdrawals).toEqual([
			{ flow: "draw", account: "mortgage", amount: 240_000_000 },
			{ flow: "sell", account: "home", amount: 150_000_000 },
		])
		expect(line?.drawn).toEqual([{ account: "cash", amount: 45_000_000 }])
		expect(line?.surplus).toEqual([{ account: "cash", amount: 315_000_000 }])
		expect(identitySides(line!)).toEqual({ moneyIn: 675_000_000, moneyOut: 675_000_000 })
		expect(rollupMismatches(result.projection.annual[0]!, line!)).toEqual([])
	})

	it("reports the sale in the roll-up: contributions include the car, withdrawals the sale", () => {
		const result = project(baseline, scenario, timeline)
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		const [year] = result.projection.annual
		expect([year?.contributions, year?.withdrawals]).toEqual([300_000_000, 390_000_000])
	})
})
