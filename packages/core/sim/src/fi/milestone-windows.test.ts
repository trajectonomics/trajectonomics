import { describe, expect, it } from "bun:test"
import { expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { Baseline, Flow, Milestone, Scenario, Timeline } from "../types"
import type { SurvivalOptions } from "../types/financial-independence"
import { financialIndependence } from "./financial-independence"

/**
 * Salary 1,000 earned, food 100 and rent 500 on each 1st from 1 Jan 2026; cash starts at zero and
 * every surplus is kept in cash. Horizon 1 Jan 2030, both ends inclusive.
 *
 * `end`: rent stops with its own `end` on 31 Dec 2026, so it lands 12 times (Jan to Dec 2026).
 * `milestone`: rent has `endAt` a static Milestone dated 1 Jan 2027. Landings strictly before that
 * date are the same 12, so both plans are the same plan.
 */
function plan(gate: "end" | "milestone"): {
	readonly scenario: Scenario
	readonly timeline: Timeline
	readonly baseline: Baseline
} {
	const salary = income("salary", 1000, { frequency: "monthly", start: "2026-01-01" })
	const food = expense("food", 100, { frequency: "monthly", start: "2026-01-01" })
	const rent =
		gate === "end"
			? expense("rent", 500, { frequency: "monthly", start: "2026-01-01", end: "2026-12-31" })
			: expense("rent", 500, { frequency: "monthly", start: "2026-01-01", endAt: "stop" })
	const flows: Flow[] = [salary, food, rent]
	const fixture = makeFixture({
		accounts: [{ id: "cash", kind: "asset", rate: 0 }],
		balances: { cash: 0 },
		flows,
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2030-01-01",
		resolution: "month",
	})
	const stop: Milestone = {
		id: "stop",
		combine: "all",
		criteria: [{ id: "c", kind: "date", on: "2027-01-01" }],
	}
	const scenario = gate === "end" ? fixture.scenario : { ...fixture.scenario, milestones: [stop] }
	return { scenario, timeline: fixture.timeline, baseline: fixture.baseline }
}

function answerFor(gate: "end" | "milestone", options: SurvivalOptions) {
	const { scenario, timeline, baseline } = plan(gate)
	const result = financialIndependence(baseline, scenario, timeline, options)
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	if (!result.financialIndependence.reachable) throw new Error("FI is not reachable")
	return result.financialIndependence
}

describe("the minimum buffer reads the gated plan, so a Flow ended by endAt counts as ended", () => {
	it("gives the same FI month for rent ended by its end date and by its endAt milestone", () => {
		// Income: 1,000 a month while earning. Earned income stops the day before candidate D, so
		// the walk saves from Jan 2026. Cash after month M's flows, with income through D − 1:
		//   cash at 1 Jan 2030 = 1,000 × n − (food 100 × 49 + rent 500 × 12) = 1,000 × n − 10,900,
		// where n counts the income landings (Jan 2026 onward) and food lands 49 times (to 1 Jan 2030).
		// The buffer is 12 months of expenses from each later date: 1,200 once rent has stopped, and
		// 1,200 at 1 Jan 2030 (food lands in the window to 2031). So n ≥ 12.1, and n = 13 is the first
		// whole count: D = 1 Feb 2027, with 2,100 left at the horizon (1,000 × 13 − 10,900 = 2,100).
		// With n = 12 (D = 1 Jan 2027) the horizon holds 1,100, below 1,200.
		expect(answerFor("end", { method: "survival", minBufferMonths: 12 }).month).toBe("2027-02-01")
		expect(answerFor("milestone", { method: "survival", minBufferMonths: 12 }).month).toBe(
			"2027-02-01",
		)
	})
})

describe("the rule-of-thumb reference reads the gated plan", () => {
	const reference = {
		multiplier: 25,
		basis: "netWorth",
		window: "next12Months",
		terms: "nominal",
	} as const

	it("reports the same annualExpenses, threshold and multipleBps for both plans", () => {
		// No minimum buffer: the first candidate with no shortfall to the horizon is 1 Dec 2026. Plan
		// A and B both land 11 income months, so cash is 11 × 1,000 − 11 × 600 = 4,400 before 1 Dec.
		// Next twelve months from 1 Dec 2026: rent 500 on 1 Dec only (rent stopped by 1 Jan 2027)
		// plus food 12 × 100 = 1,700. Threshold 25 × 1,700 = 42,500. multipleBps = floor(4,400 ×
		// 10,000 / 1,700) = floor(25,882.35) = 25,882.
		const expected = {
			annualExpenses: 1700,
			threshold: 42500,
			multipleBps: 25882,
		}
		const end = answerFor("end", { method: "survival", reference })
		const milestone = answerFor("milestone", { method: "survival", reference })
		expect(end.month).toBe("2026-12-01")
		expect(end.reference).toMatchObject(expected)
		expect(milestone.month).toBe("2026-12-01")
		expect(milestone.reference).toMatchObject(expected)
	})
})
