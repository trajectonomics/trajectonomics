import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { freelancer } from "../fixtures/freelancer"
import type { Milestone, Projection, Scenario, Timeline } from "../types"

const horizon: Timeline = { ...freelancer.timeline, horizon: "2031-01-01" }

/** The freelancer plan, projected with the Milestones given (none when omitted). */
function plan(milestones?: readonly Milestone[], timeline: Timeline = horizon): Projection {
	const scenario: Scenario =
		milestones === undefined ? freelancer.scenario : { ...freelancer.scenario, milestones }
	const result = project(freelancer.baseline, scenario, timeline)
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.projection
}

const never: Milestone = {
	id: "never",
	combine: "all",
	criteria: [
		{ id: "c", kind: "metric", metric: "netWorth", op: "atLeast", amount: 1e15, terms: "nominal" },
	],
}
const retire: Milestone = {
	id: "retire",
	combine: "all",
	criteria: [{ id: "c", kind: "date", on: "2029-01-01" }],
}
/** Holds from the first evaluation date: opening net worth is above zero. */
const immediate: Milestone = {
	id: "started",
	combine: "all",
	criteria: [
		{ id: "c", kind: "metric", metric: "netWorth", op: "atLeast", amount: 0, terms: "nominal" },
	],
}

function withoutMilestones(projection: Projection): Omit<Projection, "milestones"> {
	const { milestones: _milestones, ...rest } = projection
	return rest
}

describe("Milestones that gate no Flow leave the Projection unchanged", () => {
	it("keeps every figure byte-identical when unrelated Milestones are declared", () => {
		const bare = plan()
		const declared = plan([never, immediate, retire])
		expect(JSON.stringify(withoutMilestones(declared))).toBe(JSON.stringify(bare))
		expect(declared.milestones?.map((item) => item.id)).toEqual(["never", "started", "retire"])
	})

	it("reports the fire dates of Milestones that gate nothing, in Scenario order", () => {
		const projection = plan([immediate, retire, never])
		expect(projection.milestones).toEqual([
			{ id: "started", reached: true, date: "2026-01-01" },
			{ id: "retire", reached: true, date: "2029-01-01" },
			{ id: "never", reached: false },
		])
	})
})

describe("Milestone fire dates do not depend on the reporting resolution", () => {
	it("gives the same milestones at day and month resolution, with a Flow gated", () => {
		const gated = freelancer.scenario.flows.map((flow) =>
			flow.id === "living" ? { ...flow, endAt: "retire" } : flow,
		)
		const scenario = { ...freelancer.scenario, flows: gated, milestones: [retire, never] }
		const day = project(freelancer.baseline, scenario, horizon)
		const month = project(freelancer.baseline, scenario, { ...horizon, resolution: "month" })
		expect(day.ok && month.ok).toBe(true)
		if (!day.ok || !month.ok) return
		expect(month.projection.milestones).toEqual(day.projection.milestones)
	})
})
