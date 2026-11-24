import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { chargingSetup, fund as feeFund } from "../engine/test-fee"
import { run } from "../engine/test-helpers"
import { fund as payFund, payingSetup } from "../engine/test-payout"
import { lifetimeYear } from "../golden/lifetime-cases"
import type { Projection } from "../types"

const { baseline, scenario, timeline } = lifetimeYear
const result = project(baseline, scenario, timeline, { cashflowBreakdown: true })
const hand: Projection = result.ok ? result.projection : (undefined as never)

describe("the totals of a plan with a 1% fee and a 3.5% quarterly payout", () => {
	// Rate 0, 1,000,000,000. The fee is value / 1200 on each month end, the payout value x 350 / 40000 on a
	// quarter end, both read before the date's Flows land, so the fee of 31 Mar is read from 998,334,028 too:
	// fees 833,333 832,639 831,945 | 823,972 823,286 822,600 | 814,716 814,037 813,359 | 805,564 804,893 804,222
	// payouts 8,735,423 (31 Mar), 8,637,295 (30 Jun), 8,540,269 (30 Sep), 8,444,333 (31 Dec); fund ends 955,818,114.
	it("states 9,824,566 of fees and 34,357,320 paid out, with the fund at 955,818,114", () => {
		expect(hand.lifetimeFees).toBe(9_824_566)
		expect(hand.accountLifetimes).toEqual([
			{ account: "fund", lifetimeFees: 9_824_566, lifetimePayouts: 34_357_320 },
		])
		expect(hand.annual[0]).toMatchObject({ fees: 9_824_566, payouts: 34_357_320 })
		expect(hand.rows.at(-1)!.balances.map((balance) => balance.amount)).toEqual([
			34_357_320, 955_818_114,
		])
	})

	it("equals the sum of the roll-ups' figures over several years", () => {
		const years = project(
			baseline,
			scenario,
			{ ...timeline, horizon: "2028-06-30" },
			{
				cashflowBreakdown: true,
			},
		)
		if (!years.ok) throw new Error("refused")
		const { annual, cashflow, accountLifetimes, lifetimeFees } = years.projection
		expect(annual).toHaveLength(3)
		const fees = annual.reduce((sum, roll) => sum + roll.fees!, 0)
		const paid = annual.reduce((sum, roll) => sum + roll.payouts!, 0)
		const byAccount = cashflow!.reduce((sum, year) => sum + year.payouts![0]!.amount, 0)
		expect(lifetimeFees).toBe(fees)
		expect(accountLifetimes![0]!.lifetimeFees).toBe(fees)
		expect(accountLifetimes![0]!.lifetimePayouts).toBe(paid)
		expect(paid).toBe(byAccount)
	})
})

describe("only what an Account declares is stated", () => {
	it("states nothing without a fee or a payout, and for 0 bps is byte for byte the plan without it", () => {
		const plain = run(payingSetup([{ id: "fund", kind: "asset", rate: 0 }]))
		const zero = run(payingSetup([payFund({ bps: 0 }, { fee: { bps: 0, rounding: "floor" } })]))
		expect(Object.keys(plain)).not.toContain("accountLifetimes")
		expect(Object.keys(plain)).not.toContain("lifetimeFees")
		expect(JSON.stringify(zero)).toBe(JSON.stringify(plain))
	})

	it("states fees alone for a fee-only Account, with no payout total", () => {
		const fees = run(chargingSetup([feeFund()]))
		expect(fees.lifetimeFees).toBe(14_897_305)
		expect(fees.accountLifetimes).toEqual([{ account: "fund", lifetimeFees: 14_897_305 }])
	})

	it("states payouts alone for a payout-only Account, with no plan-wide fees", () => {
		const paid = run(payingSetup([payFund()]))
		expect(Object.keys(paid)).not.toContain("lifetimeFees")
		expect(paid.accountLifetimes).toEqual([{ account: "fund", lifetimePayouts: 39_403_990 }])
	})

	it("lists Accounts in Scenario order, the plan-wide fees adding the fee Accounts only", () => {
		const setup = chargingSetup([
			payFund({ bps: 400 }, { id: "b", fee: { bps: 120, rounding: "floor" } }),
			feeFund({ bps: 150 }, { id: "a" }),
			payFund({ bps: 400 }, { id: "c" }),
		])
		const both = run({
			...setup,
			balances: { cash: 0, a: 1_000_000_000, b: 1_000_000_000, c: 1_000_000_000 },
		})
		const listed = both.accountLifetimes!
		expect(listed.map((item) => item.account)).toEqual(["b", "a", "c"])
		expect(listed[0]!.lifetimeFees! + listed[1]!.lifetimeFees!).toBe(both.lifetimeFees!)
		expect(listed[2]).toEqual({ account: "c", lifetimePayouts: 39_403_990 })
	})
})
