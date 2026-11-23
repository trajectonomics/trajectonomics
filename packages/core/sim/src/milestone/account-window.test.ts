import { describe, expect, it } from "bun:test"
import { derivedExpense, expense } from "../engine/test-flows"
import type { Setup } from "../engine/test-helpers"
import type { Derive, Milestone } from "../types"
import { firedOn, milestoned } from "./test-milestones"

/** 1% of the home's value, read once a year (ADR 0020). */
const upkeep: Derive = {
	measures: [
		{ id: "value", op: "account", account: "home" },
		{ id: "share", op: "scale", of: "value", num: 100, den: 10_000, rounding: "halfUp" },
	],
	result: "share",
}

/** A home owned from the start at 3% and never bought, sold or routed to: nothing changes it. */
const owned: Setup = {
	accounts: [
		{ id: "cash", kind: "asset", rate: 0 },
		{ id: "home", kind: "asset", rate: 300 },
	],
	balances: { cash: 5_000_000_000, home: 500_000_000 },
	flows: [
		expense("living", 100_000, { frequency: "monthly", start: "2026-01-01" }),
		derivedExpense("upkeep", upkeep, { frequency: "annual", start: "2026-01-01" }),
	],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	start: "2026-01-01",
	horizon: "2031-01-01",
	resolution: "month",
}

/** The Milestone `costly` holds once the next 12 months of expenses reach `amount`. */
const costly = (amount: number): Milestone => ({
	id: "costly",
	combine: "all",
	criteria: [
		{
			id: "c",
			kind: "metric",
			metric: { expenses: "next12Months" },
			op: "atLeast",
			amount,
			terms: "nominal",
		},
	],
})

describe("a next-12-months window beside an upkeep that reads a home nothing changes", () => {
	// Twelve livings are 1,200,000 in every window. The home is 500,000,000 on 2026-01-01, 515,000,000
	// on 2027-01-01 and 530,450,000 on 2028-01-01 (3% a year, 365 counted days, no Feb 29 between),
	// so its 1% a year is 5,000,000, 5,150,000 and 5,304,500 on those January upkeeps.
	//   window from 2026-01-01: upkeep of 2026-01-01        = 6,200,000
	//   windows from 2026-02-01 to 2027-01-01: upkeep of 2027-01-01 = 6,350,000
	//   window from 2027-02-01: upkeep of 2028-01-01        = 6,504,500
	it("fires on the first date whose window holds the 2027 upkeep: 2026-02-01 at 6,300,000", () => {
		expect(firedOn(milestoned(owned, [costly(6_300_000)]), "costly")).toBe("2026-02-01")
	})

	it("fires when the window holds the 2028 upkeep, read at its grown value: 2027-02-01", () => {
		expect(firedOn(milestoned(owned, [costly(6_350_001)]), "costly")).toBe("2027-02-01")
	})

	it("reads the 2029 upkeep of 5,463,635 on its edge: 6,663,635 fires 2028-02-01, one more 2029-02-01", () => {
		// 3 years at 3% is 500,000,000 x 1.092727 = 546,363,500; 4 years is 562,754,405, whose 1% of
		// 5,627,544 makes the window from 2029-02-01 6,827,544.
		expect(firedOn(milestoned(owned, [costly(6_663_635)]), "costly")).toBe("2028-02-01")
		expect(firedOn(milestoned(owned, [costly(6_663_636)]), "costly")).toBe("2029-02-01")
	})
})
