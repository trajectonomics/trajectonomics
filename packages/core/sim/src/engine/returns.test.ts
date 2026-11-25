import { describe, expect, it } from "bun:test"
import type { Fixture } from "../fixtures/fixture"
import { mutate } from "./mutate"
import { resolveReturns } from "./return-rows"
import type { Returns } from "./returns"
import { createStates } from "./state"
import { makeFixture } from "./test-helpers"
import { valuation } from "./value"

const series: Returns = {
	returnsVersion: 1,
	series: [
		{
			account: "cash",
			rows: [
				{ from: "2023-01-01", returnBps: 1000 },
				{ from: "2023-06-30", returnBps: 800 },
			],
		},
	],
}

function fixture(start: string = "2023-01-01", horizon: string = "2024-01-01"): Fixture {
	return makeFixture({
		accounts: [{ id: "cash", kind: "asset", rate: 5000 }],
		balances: { cash: 100000 },
		flows: [],
		surplus: [{ account: "cash" }],
		start,
		horizon,
	})
}

function stateAt(fix: Fixture, input: Returns = series) {
	const states = createStates(
		fix.baseline,
		fix.scenario,
		fix.timeline.start,
		resolveReturns(input, fix.timeline),
	)
	return states.get("cash")!
}

describe("Return series resolution", () => {
	it("fixes each row's window and day count at run start", () => {
		const rows = resolveReturns(series, fixture().timeline).get("cash")
		expect(rows?.map((row) => [row.from, row.to, row.days])).toEqual([
			["2023-01-01", "2023-06-30", 180],
			["2023-06-30", "2024-01-01", 185],
		])
	})

	it("gives a Feb 28 row no counted days when the leap day is not counted", () => {
		const leap = fixture("2028-02-28", "2028-03-01")
		const input: Returns = {
			returnsVersion: 1,
			series: [
				{
					account: "cash",
					rows: [
						{ from: "2028-02-28", returnBps: 5000 },
						{ from: "2028-02-29", returnBps: 0 },
					],
				},
			],
		}
		const days = resolveReturns(input, leap.timeline)
			.get("cash")
			?.map((row) => row.days)
		expect(days).toEqual([0, 1])
		expect(valuation(stateAt(leap, input), "2028-03-01")).toBe(100000n)
	})
})

describe("valuation over a Return series", () => {
	it("holds 90 of a row's 180 counted days", () => {
		// 100,000 × (10,000×180 + 1,000×90) / (10,000×180) = 105,000
		expect(valuation(stateAt(fixture()), "2023-04-01")).toBe(105000n)
	})

	it("reaches the whole first row at its end", () => {
		// 100,000 × 11,000 / 10,000 = 110,000
		expect(valuation(stateAt(fixture()), "2023-06-30")).toBe(110000n)
	})

	it("walks both rows to the horizon", () => {
		// 110,000 × 10,800 / 10,000 = 118,800
		expect(valuation(stateAt(fixture()), "2024-01-01")).toBe(118800n)
	})

	it("replaces the Account's rate for the dates the series covers", () => {
		// A 5,000 bps rate would give 150,000; the series wins.
		expect(valuation(stateAt(fixture()), "2024-01-01")).toBe(118800n)
	})

	it("makes a change mid-row neutral: a zero change still settles to 110,000", () => {
		const state = stateAt(fixture())
		expect(mutate(state, "2023-04-01", 0n, undefined)).toBeUndefined()
		// The row's start balance takes the full 10%: 100,000 × 1.1, with no r² term.
		expect(valuation(state, "2023-06-30")).toBe(110000n)
	})

	it("gives a deposit mid-row its own part of the row's return", () => {
		const state = stateAt(fixture())
		mutate(state, "2023-04-01", 10000n, undefined)
		// 115,000 held, of which 110,000 still earns 10% × 90/180 = 5,500: 100,000 × 1.1 + 10,000 × 1.05.
		expect(valuation(state, "2023-06-30")).toBe(120500n)
	})

	it("takes a withdrawal mid-row off the part still to earn", () => {
		const state = stateAt(fixture())
		mutate(state, "2023-04-01", -10000n, undefined)
		// 100,000 × 1.1 − 10,000 × 1.05 = 99,500.
		expect(valuation(state, "2023-06-30")).toBe(99500n)
	})

	it("leaves nothing after a withdrawal of the whole balance mid-row", () => {
		const state = stateAt(fixture())
		mutate(state, "2023-04-01", -105000n, undefined)
		expect(valuation(state, "2023-06-30")).toBe(0n)
		expect(valuation(state, "2024-01-01")).toBe(0n)
	})

	it("restarts the part still to earn at the next row's start", () => {
		const state = stateAt(fixture())
		mutate(state, "2023-04-01", 10000n, undefined)
		// 120,500 at 2023-06-30, the second row's start; 8% over 185 days.
		mutate(state, "2023-09-01", -20000n, undefined)
		// 120,500 × 800 × 63 / 1,850,000 = 3,282.7 → 123,783 at 2023-09-01, then 103,783 after the withdrawal.
		expect(valuation(state, "2023-09-01")).toBe(103783n)
		// 103,783 + 100,500 × 800 × 122 / 1,850,000 = 103,783 + 5,302.1 → 109,085
		expect(valuation(state, "2024-01-01")).toBe(109085n)
	})
})
