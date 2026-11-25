import { describe, expect, it } from "bun:test"
import { derivedIncome, expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import { financialIndependence, project } from "../index"
import type { Derive } from "../types"

const monthly = { frequency: "monthly", start: "2026-01-01" } as const

/** A bonus of a thousandth of inv above `floor`: negative whenever inv falls below it. */
function bonusOver(floor: number): Derive {
	return {
		measures: [
			{ id: "value", op: "account", account: "inv" },
			{ id: "floor", op: "const", value: floor },
			{ id: "over", op: "sub", a: "value", b: "floor" },
			{ id: "share", op: "scale", of: "over", num: 1, den: 1000, rounding: "halfUp" },
		],
		result: "share",
	}
}

function setup(floor: number) {
	return makeFixture({
		accounts: [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "inv", kind: "asset", rate: 500 },
		],
		balances: { cash: 0, inv: floor + 200_000 },
		flows: [
			income("salary", 500_000, { ...monthly, earned: true }),
			expense("living", 150_000, monthly),
			derivedIncome("bonus", bonusOver(floor), {
				frequency: "annual",
				start: "2026-06-15",
				earned: true,
			}),
		],
		surplus: [{ account: "inv" }],
		withdraw: ["cash", "inv"],
		start: "2026-01-01",
		horizon: "2031-01-01",
		resolution: "month",
	})
}

function run(floor: number, amount: number, window: "next12Months" | "trailing12Months") {
	const { baseline, scenario, timeline } = setup(floor)
	expect(project(baseline, scenario, timeline).ok).toBe(true)
	return financialIndependence(baseline, scenario, timeline, {
		method: "survival",
		minBufferMonths: 0,
		retirementSpending: { amount, growth: "inflation" },
		reference: { multiplier: 25, basis: "netWorth", window, terms: "nominal" },
	} as never)
}

// Retirement spending replaces the expenses, yet a trailing-12-months reference still prices the
// plan's own expenses through the horizon: a stopped earned bonus no expense reads must not be
// priced from the candidate's depleted inv (#376).
describe("a stopped earned Derived income under retirement spending (#376)", () => {
	const rows = [
		{ floor: 5_000_000, amount: 300_000 },
		{ floor: 10_000_000, amount: 300_000 },
		{ floor: 10_000_000, amount: 490_000 },
	] as const
	for (const { floor, amount } of rows) {
		it(`finds an FI month with floor ${floor} and ${amount}: trailing12Months`, () => {
			const result = run(floor, amount, "trailing12Months")
			if (!result.ok) throw new Error(JSON.stringify(result.problems))
			expect(result.ok).toBe(true)
		})
	}
	it("finds an FI month with next12Months on the same plan", () => {
		const result = run(5_000_000, 300_000, "next12Months")
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		expect(result.ok).toBe(true)
	})
})
