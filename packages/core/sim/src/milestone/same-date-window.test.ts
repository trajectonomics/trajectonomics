import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { financialIndependence } from "../fi/financial-independence"
import { thaiEmployee } from "../fixtures/thai-employee"
import type { Flow, Milestone, Scenario, Timeline } from "../types"

/**
 * A Milestone fired on a date counts for the next one on that date (ADR 0012), so an expense
 * window read later on the date is figured with the Flows the earlier fire has landed.
 */
const { baseline } = thaiEmployee
const timeline: Timeline = { start: "2026-01-01", horizon: "2030-01-01", resolution: "month" }
const huge = 100_000_000_000

const window = (id: string, op: "atLeast" | "atMost", amount: number): Milestone => ({
	id,
	combine: "all",
	criteria: [
		{
			id: "c",
			kind: "metric",
			metric: { expenses: "next12Months" },
			op,
			amount,
			terms: "nominal",
		},
	],
})
const probe = window("probe", "atMost", 0)
const go: Milestone = {
	id: "go",
	combine: "all",
	criteria: [
		{
			id: "c",
			kind: "metric",
			metric: "liabilities",
			op: "atMost",
			amount: huge,
			terms: "nominal",
		},
	],
}
const big = window("big", "atLeast", huge)
const lavish: Flow = {
	id: "lavish",
	kind: "expense",
	amount: 10_000_000_000,
	frequency: "monthly",
	start: "2026-01-01",
	growth: "inflation",
	startAt: "go",
	endAt: "big",
}

function plan(milestones: readonly Milestone[]): Scenario {
	return { ...thaiEmployee.scenario, flows: [...thaiEmployee.scenario.flows, lavish], milestones }
}

describe("a window read later on a date sees what an earlier fire on it landed", () => {
	for (const milestones of [
		[go, big],
		[probe, go, big],
	]) {
		const names = milestones.map((item) => item.id).join(", ")
		it(`projects the same with Milestones ${names}`, () => {
			const result = project(baseline, plan(milestones), timeline)
			if (!result.ok) throw new Error(JSON.stringify(result.problems))
			const { projection } = result
			expect(projection.milestones?.find((item) => item.id === "big")).toEqual({
				id: "big",
				reached: true,
				date: "2026-01-01",
			})
			expect(projection.runsOut).toBeUndefined()
		})
	}

	it("finds the same FI month with and without the probe", () => {
		const options = { method: "survival" } as const
		const without = financialIndependence(baseline, plan([go, big]), timeline, options)
		const withProbe = financialIndependence(baseline, plan([probe, go, big]), timeline, options)
		expect(withProbe).toEqual(without)
	})
})
