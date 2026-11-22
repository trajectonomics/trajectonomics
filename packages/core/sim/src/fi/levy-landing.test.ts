import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { expense, income } from "../engine/test-flows"
import { emptyCarryIn, makeFixture, withCarryIn } from "../engine/test-helpers"
import { financialIndependence } from "../index"
import type { Levy, LevyReport, Scenario } from "../types"

// A 1% levy on salary, tallied on Landed dates.
const salaryLevy: Levy = {
	id: "income",
	period: { month: 1, day: 1 },
	settlement: { month: 6, day: 30 },
	measures: [
		{ id: "income", op: "tally", label: "salary", basis: "gross" },
		{ id: "tax", op: "scale", of: "income", num: 1, den: 100, rounding: "floor" },
	],
	due: "tax",
}

/**
 * Two earned Flows on a `next` Calendar whose only Holiday is Friday 2027-12-31:
 * - `salary`, 6,000 due on the last day of each month, so December 2027's is Due Friday
 *   2027-12-31, a Holiday, and Lands Monday 2028-01-03 (2028-01-01 is a Saturday);
 * - `wage`, 4,000 due on the 15th, which always Lands in its own month.
 * `earnedEnd` is the naive stop: an `end` date capping the Due dates of both.
 */
function setup(earnedEnd?: string) {
	const end = earnedEnd === undefined ? {} : { end: earnedEnd }
	return makeFixture({
		accounts: [{ id: "cash", kind: "asset", rate: 0 }],
		balances: { cash: 4000 },
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		horizon: "2028-06-30",
		calendar: { dayRule: "next", holidays: ["2027-12-31"] },
		flows: [
			income("salary", 6000, {
				frequency: "monthly",
				start: "2026-01-31",
				label: "salary",
				...end,
			}),
			income("wage", 4000, { frequency: "monthly", start: "2026-01-15", label: "salary", ...end }),
			expense("living", 8000, { frequency: "monthly", start: "2026-02-01" }),
		],
		levy: withCarryIn(salaryLevy, emptyCarryIn("2025-01-01")),
	})
}

function dueByYear(reports: readonly LevyReport[] | undefined): number[] {
	return (reports ?? []).flatMap((report) => report.periods.map((period) => period.due))
}

function projected(earnedEnd: string): readonly LevyReport[] | undefined {
	const { baseline, scenario, timeline } = setup(earnedEnd)
	const result = project(baseline, scenario as Scenario, timeline)
	if (!result.ok) throw new Error("project failed")
	return result.projection.levies
}

describe("the Levy results of an FI answer follow the walk's own Landed dates", () => {
	const { baseline, scenario, timeline } = setup()
	const result = financialIndependence(baseline, scenario, timeline, { method: "survival" })
	if (!result.ok || !result.financialIndependence.reachable) throw new Error("not reachable")
	const answer = result.financialIndependence

	it("reaches 2028-01-01, the month after a Due date whose Landed date is inside it", () => {
		// The December 2027 wage (4,000) Lands 2027-12-15, so the December candidate loses it
		// and fails, while the January candidate keeps it and survives.
		expect(answer.month).toBe("2028-01-01")
	})

	it("excludes the salary that is Due before the FI month but Lands in it", () => {
		// 2026: salary Due on the 31st, Landed in the same year (Saturday 2026-01-31 moves to
		// Monday 2026-02-02, still 2026), 12 x 6,000; wage 12 x 4,000; 120,000 x 1% = 1,200.
		// 2027: wage 12 x 4,000 = 48,000, salary 11 x 6,000 = 66,000 (December's Lands in 2028);
		// 114,000 x 1% = 1,140. 2028: earned income has stopped, so 0.
		expect(dueByYear(answer.levies)).toEqual([0, 1200, 1140, 0])
	})

	it("differs from a projection that ends earned income the day before the FI month", () => {
		// The end date caps Due dates, and December's salary is Due 2027-12-31, so it is kept
		// and Lands 2028-01-03, inside the FI month: 6,000 x 1% = 60 in 2028 that the walk
		// does not owe. It is the only difference; 2026 and 2027 are the same.
		expect(dueByYear(projected("2027-12-31"))).toEqual([0, 1200, 1140, 60])
		expect(dueByYear(answer.levies)).not.toEqual(dueByYear(projected("2027-12-31")))
	})
})
