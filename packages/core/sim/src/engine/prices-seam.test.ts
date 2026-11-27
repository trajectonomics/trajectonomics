import { describe, expect, it } from "bun:test"
import { levySalaryDay } from "../golden/levy-cases"
import type { PricePath } from "../money/inflation"
import type { Levy } from "../types"
import { projectChecked } from "./project"
import type { Returns } from "./returns"
import { runEngine } from "./run"
import { makeFixture } from "./test-helpers"

const START = "2026-01-01"

const prices: PricePath = { start: START, ratesBps: [100, 500, 300], outsideBps: 300 }

/** A path whose first year is far from the Scenario's 500, so a Levy reading it would move. */
const harsh: PricePath = { start: START, ratesBps: [1000, 500, 300], outsideBps: 300 }

const returns: Returns = { returnsVersion: 1, series: [], prices }

const harshReturns: Returns = { returnsVersion: 1, series: [], prices: harsh }

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

/** A Levy whose one constant grows with inflation from before the Timeline start. */
const duty: Levy = {
	id: "duty",
	period: { month: 1, day: 1 },
	settlement: { month: 3, day: 31 },
	due: "total",
	measures: [
		{ id: "income", op: "tally", label: "salary", basis: "gross" },
		{ id: "base", op: "const", value: 1_000_000, asOf: "2025-01-01", growth: "inflation" },
		{ id: "total", op: "add", a: "income", b: "base" },
	],
}

/** A fixed salary under a Levy that must read the Scenario's 500 bps, never the path's rates. */
function taxed() {
	return makeFixture({
		accounts: [{ id: "cash", kind: "asset", rate: 0 }],
		balances: { cash: 0 },
		flows: [
			{
				id: "salary",
				kind: "income",
				earned: true,
				amount: 10_000_000,
				frequency: "monthly",
				start: "2026-01-31",
				growth: { bps: 0 },
				label: "salary",
			},
		],
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		inflation: 500,
		horizon: "2028-06-01",
		levy: duty,
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

	it("leaves a Levy's growing constant on the Scenario's one rate across two growth years", () => {
		const { baseline, scenario, timeline } = taxed()
		const withPrices = projectChecked(baseline, scenario, timeline, {}, harshReturns)
		const without = projectChecked(baseline, scenario, timeline, {})
		if (!withPrices.ok || !without.ok) throw new Error("refused")
		expect(withPrices.projection.levies).toEqual(without.projection.levies)
		// 1,000,000 at 500 bps from 2025-01-01, settled 2027-03-31 and 2028-03-31, over 120,000,000.
		const settled = withPrices.projection.levies![0]!.periods.filter(
			(period) => period.settled && period.from >= START,
		)
		expect(settled.map((period) => period.due)).toEqual([121_102_500, 121_157_625])
	})

	it("leaves the salary-case Levy on the Scenario's one rate", () => {
		const { baseline, scenario, timeline } = levySalaryDay
		const withPrices = projectChecked(baseline, scenario, timeline, {}, returns)
		const without = projectChecked(baseline, scenario, timeline, {})
		if (!withPrices.ok || !without.ok) throw new Error("refused")
		expect(withPrices.projection.levies).toEqual(without.projection.levies)
	})
})
