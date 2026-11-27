import { describe, expect, it } from "bun:test"
import type { PricePath } from "../money/inflation"
import type { Derive } from "../types"
import { projectChecked } from "./project"
import { makeFixture } from "./test-helpers"

const START = "2026-01-01"

/** A Derived amount's one Measure: a constant that grows with inflation from the Timeline start. */
const derive: Derive = {
	measures: [{ id: "result", op: "const", value: 1_000_000, asOf: START, growth: "inflation" }],
	result: "result",
}

const fixture = makeFixture({
	accounts: [{ id: "cash", kind: "asset", rate: 0 }],
	balances: { cash: 100_000_000 },
	flows: [{ id: "fee", kind: "expense", frequency: "annual", start: START, derive }],
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	inflation: 5000,
	horizon: "2029-01-01",
})

/** Two years that differ, so a constant reading the Scenario's rate cannot pass by accident. */
const prices: PricePath = { start: START, ratesBps: [1000, 0], outsideBps: 0 }

function expenses(withPrices: boolean): readonly number[] {
	const returns = withPrices ? { returnsVersion: 1 as const, series: [], prices } : undefined
	const result = projectChecked(fixture.baseline, fixture.scenario, fixture.timeline, {}, returns)
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.projection.annual.map((rollup) => rollup.expense)
}

describe("a Derived amount's growing constant under a Price path", () => {
	it("follows the path's yearly rates, not the Scenario's one rate", () => {
		// Year 0 grows by the path's 1,000 bps; year 1 by its 0 bps. The Scenario states 5,000.
		expect(expenses(true)).toEqual([1_000_000, 1_100_000, 1_100_000, 1_100_000])
	})

	it("keeps the Scenario's rate when the run has no Price path", () => {
		expect(expenses(false)).toEqual([1_000_000, 1_500_000, 2_250_000, 3_375_000])
	})
})
