import { describe, expect, it } from "bun:test"
import { expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import { financialIndependence, project } from "../index"
import type { Flow, Milestone, SurvivalOptions } from "../types"
import { oracleMilestoneFi } from "./oracle-milestone-fi"

const monthly = { frequency: "monthly", start: "2026-01-01" } as const

/** A Milestone that fires on the first evaluation date the opening net worth reaches `amount`. */
function netWorthAtLeast(id: string, amount: number): Milestone {
	const criterion = { id: "c", kind: "metric", metric: "netWorth", op: "atLeast", amount } as const
	return { id, combine: "all", criteria: [{ ...criterion, terms: "nominal" }] }
}

function plan(cash: number, flows: readonly Flow[], milestones: readonly Milestone[]): Fixture {
	const fixture = makeFixture({
		accounts: [{ id: "cash", kind: "asset", rate: 0 }],
		balances: { cash },
		flows,
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2028-01-01",
		resolution: "month",
	})
	return { ...fixture, scenario: { ...fixture.scenario, milestones } }
}

const reference = {
	multiplier: 25,
	basis: "netWorth",
	window: "next12Months",
	terms: "nominal",
} as const

function engine(fixture: Fixture, options: SurvivalOptions) {
	const { baseline, scenario, timeline } = fixture
	const result = financialIndependence(baseline, scenario, timeline, options)
	if (!result.ok || !result.financialIndependence.reachable) throw new Error("FI not reachable")
	const { month, reference: figures } = result.financialIndependence
	return { month, annualExpenses: figures?.annualExpenses, threshold: figures?.threshold }
}

/** Both sides on one plan: the engine's FI month and reference expense against the brute force. */
function bothAgree(fixture: Fixture, minBufferMonths: number) {
	const options = { method: "survival", minBufferMonths, reference } as const
	const found = engine(fixture, options)
	const oracle = oracleMilestoneFi(fixture, minBufferMonths)
	expect(oracle).toBeDefined()
	expect({ month: found.month, annualExpenses: found.annualExpenses }).toEqual(oracle!)
	return found
}

// A mortgage that ends once the plan is rich. The FI stop ends the salary, so it can keep the plan
// from ever getting rich, and the mortgage then keeps landing in the candidate's own plan.
const salary = income("salary", 1000, monthly)
const food = expense("food", 100, monthly)

describe("the FI scan gates each candidate's windows by that candidate's own Milestones", () => {
	it("Case A: a mortgage ending at 'rich' counts for a candidate that never gets rich", () => {
		// Cash 12,000; salary 1,000, food 100, mortgage 300. Opening net worth reaches 13,000 on
		// 1 Mar 2026 (12,000 + 2 × 600 = 13,200), so the unchanged plan ends the mortgage there.
		// Candidate 1 Feb: stop leaves 12,600 on 1 Feb, so 'rich' never fires and the mortgage lands
		// 24 more times: 12,600 − 24 × 400 = 3,000 on 1 Jan 2028, below 12 × 400 = 4,800.
		// Candidate 1 Mar: 'rich' fires that day (opening 13,200), the mortgage landed twice, then
		// food only: 13,200 − 23 × 100 = 10,900, above the 1,200 buffer. FI is 1 Mar 2026.
		const mortgage = expense("mortgage", 300, { ...monthly, endAt: "rich" })
		const fixture = plan(12_000, [food, salary, mortgage], [netWorthAtLeast("rich", 13_000)])
		expect(bothAgree(fixture, 12).month).toBe("2026-03-01")
	})

	it("Case B: travel starting at 'rich' does not count for a candidate that never gets rich", () => {
		// Cash 5,000; salary 1,000, food 100, travel 300 from 'rich' (net worth 6,000). The unchanged
		// plan is rich on 1 Mar 2026 (5,900 on 1 Feb, 6,800 on 1 Mar). Candidate 1 Jan stops the
		// salary at once: net worth only falls, travel never lands, and cash is 5,000 − 25 × 100 =
		// 2,500 on 1 Jan 2028, above the 12 × 100 = 1,200 buffer. FI is 1 Jan 2026 with a
		// reference expense of 12 × 100 = 1,200 and a threshold of 25 × 1,200 = 30,000.
		const travel = expense("travel", 300, { ...monthly, startAt: "rich" })
		const fixture = plan(5_000, [food, salary, travel], [netWorthAtLeast("rich", 6_000)])
		const found = bothAgree(fixture, 12)
		expect(found).toEqual({ month: "2026-01-01", annualExpenses: 1200, threshold: 30_000 })
	})

	it("Case C: travel from 'rich' stays out of the window while 'rich' is unfired by the horizon", () => {
		// Cash 1,500; salary 1,000 (earned), pension 200 (not earned), food 100, travel 300 from 'rich'
		// (net worth 4,100). Candidate 1 Jan 2026 stops the salary, so net worth gains 100 a month and
		// 'rich' would fire on 1 Mar 2028, two months past the horizon. The candidate's walk ends at the
		// horizon with 'rich' unfired, so travel never lands and the twelve months from 1 Jan 2026 hold
		// food only: 1,200, a threshold of 25 × 1,200 = 30,000. Travel drops out because the `startAt`
		// gate is unfired (ADR 0012). The buffer checks at the horizon read windows past it, so the
		// past-horizon branch is exercised here.
		//
		// Contrast: the same plan with 'rich' a static Milestone dated 1 Mar 2028. A static fire date
		// past the horizon still counts, so travel lands in the window past the horizon: the buffer at
		// the horizon needs food 1,200 + travel from 1 Mar 2028, 10 × 300 = 3,000, so 4,200. Candidate
		// 1 Jan 2026 holds 1,500 + 25 × 100 = 4,000 there and fails, and FI moves to 1 Feb 2026.
		const pension = income("pension", 200, { ...monthly, earned: false })
		const travel = expense("travel", 300, { ...monthly, startAt: "rich" })
		const fixture = plan(1_500, [food, salary, pension, travel], [netWorthAtLeast("rich", 4_100)])
		expect(bothAgree(fixture, 12)).toEqual({
			month: "2026-01-01",
			annualExpenses: 1200,
			threshold: 30_000,
		})
		const dated: Milestone = {
			id: "rich",
			combine: "all",
			criteria: [{ id: "c", kind: "date", on: "2028-03-01" }],
		}
		const contrast = plan(1_500, [food, salary, pension, travel], [dated])
		expect(bothAgree(contrast, 12).month).toBe("2026-02-01")
	})

	it("fires on the same date with or without the stop, and agrees", () => {
		// Cash 10,000; 'rich' is 10,500. Opening net worth: 10,000 on 1 Jan, 10,600 on 1 Feb
		// (10,000 + 1,000 − 100 − 300), so the unchanged plan fires on 1 Feb. Candidate 1 Feb
		// keeps the January salary, so it fires on 1 Feb too: the mortgage landed once, 10,600
		// left, then food 24 × 100: 8,200. Candidate 1 Jan never fires and ends at 0.
		const mortgage = expense("mortgage", 300, { ...monthly, endAt: "rich" })
		const fixture = plan(10_000, [food, salary, mortgage], [netWorthAtLeast("rich", 10_500)])
		const { baseline, scenario, timeline } = fixture
		const unchanged = project(baseline, scenario, timeline)
		if (!unchanged.ok) throw new Error("projection failed")
		expect(unchanged.projection.milestones).toEqual([
			{ id: "rich", reached: true, date: "2026-02-01" },
		])
		expect(bothAgree(fixture, 12).month).toBe("2026-02-01")
	})

	it("agrees on a static Milestone, as the engine did before candidates were gated apart", () => {
		// Rent 500 ends on the static date 1 Jan 2027 (12 landings), so no candidate moves it. A
		// candidate with n salary landings ends with 1,000 × n − (food 25 × 100 + rent 12 × 500) =
		// 1,000 × n − 8,500 on 1 Jan 2028.
		// Buffer 12: the horizon needs 12 × 100 = 1,200, so n = 10, candidate 1 Nov 2026 (1,500 left;
		// n = 9 leaves 500). Its next twelve months from 1 Nov 2026: food 1,200 + rent Nov, Dec 1,000.
		// No buffer: n = 9 is the first with cash left (500), candidate 1 Oct 2026, whose next twelve
		// months hold food 1,200 + rent Oct, Nov, Dec 1,500.
		const rent = expense("rent", 500, { ...monthly, endAt: "stop" })
		const stop: Milestone = {
			id: "stop",
			combine: "all",
			criteria: [{ id: "c", kind: "date", on: "2027-01-01" }],
		}
		const fixture = plan(0, [salary, food, rent], [stop])
		expect(bothAgree(fixture, 12)).toMatchObject({ month: "2026-11-01", annualExpenses: 2200 })
		expect(bothAgree(fixture, 0)).toMatchObject({ month: "2026-10-01", annualExpenses: 2700 })
	})
})
