import type { Fixture } from "../fixtures/fixture"
import { freelancer } from "../fixtures/freelancer"
import type { Milestone, Scenario } from "../types"

/** Dated, metric and chained Milestones gating the freelancer's living costs and a retainer's end. */
const milestones: readonly Milestone[] = [
	{ id: "retire", combine: "all", criteria: [{ id: "c", kind: "date", on: "2030-01-01" }] },
	{
		id: "rich",
		combine: "all",
		criteria: [
			{
				id: "c",
				kind: "metric",
				metric: "allAssets",
				op: "atLeast",
				amount: 30_000_000,
				terms: "nominal",
			},
		],
	},
	{
		id: "later",
		combine: "all",
		criteria: [{ id: "c", kind: "milestone", milestone: "rich", months: 12 }],
	},
]

const gated: Scenario = {
	...freelancer.scenario,
	flows: freelancer.scenario.flows.map((flow) =>
		flow.id === "living" ? { ...flow, endAt: "retire" } : flow,
	),
	milestones,
}

/** The freelancer with Milestones gating its living costs, reported by month to 2036. */
export const milestoneFreelancer: Fixture = {
	baseline: freelancer.baseline,
	scenario: gated,
	timeline: { ...freelancer.timeline, horizon: "2036-01-01", resolution: "month" },
}
