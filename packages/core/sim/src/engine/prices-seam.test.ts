import { describe, expect, it } from "bun:test"
import { levySalaryDay } from "../golden/levy-cases"
import type { PricePath } from "../money/inflation"
import { projectChecked } from "./project"
import type { Returns } from "./returns"
import { runEngine } from "./run"
import { makeFixture } from "./test-helpers"

const START = "2026-01-01"

const prices: PricePath = { start: START, ratesBps: [100, 500, 300], outsideBps: 300 }

const returns: Returns = { returnsVersion: 1, series: [], prices }

function stream() {
	return makeFixture({
		accounts: [{ id: "cash", kind: "asset", rate: 0 }],
		balances: { cash: 0 },
		flows: [
			{
				id: "salary",
				kind: "income",
				earned: true,
				amount: 1_000_000,
				frequency: "annual",
				start: START,
				growth: "inflation",
			},
		],
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		inflation: 300,
		horizon: "2028-06-01",
	})
}

describe("the run seam for a Price path", () => {
	it("grows an inflation-following Stream by the path's yearly rates", () => {
		const { baseline, scenario, timeline } = stream()
		const result = runEngine(baseline, scenario, timeline, [], returns)
		if (!result.ok) throw new Error("refused")
		const paid = result.run.totals.filter((day) => day.income > 0n).map((day) => day.income)
		expect(paid).toEqual([1_000_000n, 1_010_000n, 1_060_500n])
	})

	it("leaves the Levy on the Scenario's one rate", () => {
		const { baseline, scenario, timeline } = levySalaryDay
		const withPrices = projectChecked(baseline, scenario, timeline, {}, returns)
		const without = projectChecked(baseline, scenario, timeline, {})
		if (!withPrices.ok || !without.ok) throw new Error("refused")
		expect(withPrices.projection.levies).toEqual(without.projection.levies)
	})
})
