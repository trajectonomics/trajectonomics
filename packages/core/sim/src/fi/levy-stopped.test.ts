import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { expense, income } from "../engine/test-flows"
import { emptyCarryIn, makeFixture, withCarryIn } from "../engine/test-helpers"
import { financialIndependence } from "../index"
import type { Levy, Scenario } from "../types"

const incomeLevy: Levy = {
	id: "income",
	period: { month: 1, day: 1 },
	settlement: { month: 6, day: 30 },
	measures: [{ id: "income", op: "tally", label: "salary", basis: "gross" }],
	due: "income",
}

function setup(salaryEnd?: string) {
	return makeFixture({
		accounts: [{ id: "cash", kind: "asset", rate: 0 }],
		balances: { cash: 0 },
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		horizon: "2027-06-30",
		flows: [
			income("salary", 1000, {
				frequency: "monthly",
				label: "salary",
				...(salaryEnd === undefined ? {} : { end: salaryEnd }),
			}),
			expense("living", 100, { frequency: "monthly" }),
		],
		levy: withCarryIn(incomeLevy, emptyCarryIn("2025-01-01")),
	})
}

function dueOf(scenarioProjection: ReturnType<typeof project>): number[] {
	if (!scenarioProjection.ok) throw new Error("project failed")
	return (scenarioProjection.projection.levies ?? []).flatMap((report) =>
		report.periods.map((period) => period.due),
	)
}

describe("the Levy results of a reachable FI answer", () => {
	it("are those of the path that stops earned income at the FI month", () => {
		const { baseline, scenario, timeline } = setup()
		const result = financialIndependence(baseline, scenario, timeline, { method: "survival" })
		if (!result.ok || !result.financialIndependence.reachable) throw new Error("not reachable")
		expect(result.financialIndependence.month).toBe("2027-03-01")
		const stopped = setup("2027-02-28")
		const expected = project(stopped.baseline, stopped.scenario as Scenario, stopped.timeline)
		expect(result.financialIndependence.levies).toEqual(
			expected.ok ? expected.projection.levies : undefined,
		)
		// 2025 is closed at zero, 2026 is a full working year (12 x 1000) and 2027 holds two months of salary, not six.
		expect(dueOf(expected)).toEqual([0, 12_000, 2_000])
		expect(dueOf(project(baseline, scenario, timeline))).toEqual([0, 12_000, 6_000])
	})

	it("are absent when the Scenario declares no Levy", () => {
		const { baseline, scenario, timeline } = makeFixture({
			accounts: [{ id: "cash", kind: "asset", rate: 0 }],
			balances: { cash: 0 },
			surplus: [{ account: "cash" }],
			withdraw: ["cash"],
			horizon: "2027-06-30",
			flows: [income("salary", 1000, { frequency: "monthly" }), expense("living", 100)],
		})
		const result = financialIndependence(baseline, scenario, timeline, { method: "survival" })
		if (!result.ok || !result.financialIndependence.reachable) throw new Error("not reachable")
		expect("levies" in result.financialIndependence).toBe(false)
	})
})
