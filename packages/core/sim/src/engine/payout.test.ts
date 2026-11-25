import { describe, expect, it } from "bun:test"
import { amounts, rowAt } from "./test-helpers"
import { fund, payingSetup, projected } from "./test-payout"

describe("a quarterly payout on a constant-rate Account", () => {
	// 1,000,000,000 at 0%, 400 bps a year paid quarterly: 1,000,000,000 x 400 / 40000 = 10,000,000 on 31 Mar,
	// then 9,900,000 (30 Jun), 9,801,000 (30 Sep) and 9,702,990 (31 Dec) off what is left.
	const projection = projected(payingSetup([fund()]), { cashflowBreakdown: true })

	it("takes each payout off the Account's value of that date and lands it in cash", () => {
		expect(amounts(rowAt(projection, "2026-03-30"))).toEqual({ cash: 0, fund: 1_000_000_000 })
		expect(amounts(rowAt(projection, "2026-03-31"))).toEqual({
			cash: 10_000_000,
			fund: 990_000_000,
		})
		expect(amounts(rowAt(projection, "2026-06-30"))).toEqual({
			cash: 19_900_000,
			fund: 980_100_000,
		})
		expect(amounts(rowAt(projection, "2026-09-30"))).toEqual({
			cash: 29_701_000,
			fund: 970_299_000,
		})
		expect(amounts(rowAt(projection, "2026-12-31"))).toEqual({
			cash: 39_403_990,
			fund: 960_596_010,
		})
	})

	it("reports 39,403,990 of payouts, inside income, and no growth: the total return is 0%", () => {
		expect(projection.annual[0]).toMatchObject({
			income: 39_403_990,
			payouts: 39_403_990,
			interest: 0,
			closingNetWorth: 1_000_000_000,
		})
	})

	it("lists the payouts by Account, outside the declared income Flows, and keeps the identity", () => {
		const year = projection.cashflow![0]!
		expect(year.income).toEqual([])
		expect(year.payouts).toEqual([{ account: "fund", amount: 39_403_990 }])
		expect(year.surplus).toEqual([{ account: "cash", amount: 39_403_990 }])
	})
})

describe("a payout that leaves the Account's total return unchanged", () => {
	// 10% a year from 2025-12-31: one whole year (365 counted days) gives 1,100,000,000 on 2026-12-31,
	// 300 bps of it is 33,000,000, and the remaining 1,067,000,000 grows to 1,173,700,000 on 2027-12-31,
	// whose 300 bps is 35,211,000.
	const setup = payingSetup(
		[fund({ bps: 300, frequency: "annual", start: "2026-01-01" }, { rate: 1000 })],
		{
			start: "2025-12-31",
			horizon: "2027-12-31",
			resolution: "month",
		},
	)
	const projection = projected(setup)

	it("pays on each 31 December and compounds the rest at the full rate", () => {
		expect(amounts(rowAt(projection, "2026-12-31"))).toEqual({
			cash: 33_000_000,
			fund: 1_067_000_000,
		})
		expect(amounts(rowAt(projection, "2027-12-31"))).toEqual({
			cash: 68_211_000,
			fund: 1_138_489_000,
		})
	})

	it("is the same money as without a payout: payout and Account together are the Account's growth", () => {
		const plain = projected(
			payingSetup([{ id: "fund", kind: "asset", rate: 1000 }], {
				start: "2025-12-31",
				horizon: "2026-12-31",
				resolution: "month",
			}),
		)
		expect(amounts(rowAt(plain, "2026-12-31"))["fund"]).toBe(1_100_000_000)
		expect(33_000_000 + 1_067_000_000).toBe(1_100_000_000)
		// The growth of both years, 100,000,000 and 106,700,000, is all interest: the payouts are not.
		const interest = projection.annual.reduce((sum, year) => sum + year.interest, 0)
		expect(interest).toBe(206_700_000)
	})
})

describe("rounding a payout", () => {
	// 300 satang at 50 bps a year paid yearly is 1.5, and 500 is 2.5: the tie goes up for halfUp and ceil.
	const paid = (value: number, rounding: "floor" | "halfUp" | "ceil") => {
		const setup = payingSetup([fund({ bps: 50, frequency: "annual", rounding })], {
			balances: { cash: 0, fund: value },
			start: "2026-01-01",
			horizon: "2026-12-31",
			resolution: "month",
		})
		return amounts(rowAt(projected(setup), "2026-12-31"))["cash"]
	}

	it("floors 1.5 to 1, rounds it half up to 2 and ceils it to 2", () => {
		expect([paid(300, "floor"), paid(300, "halfUp"), paid(300, "ceil")]).toEqual([1, 2, 2])
	})

	it("floors 2.5 to 2, rounds it half up to 3 and ceils it to 3", () => {
		expect([paid(500, "floor"), paid(500, "halfUp"), paid(500, "ceil")]).toEqual([2, 3, 3])
	})
})
