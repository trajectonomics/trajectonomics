/** TEST-ONLY: a six-year Thai-employee plan whose metric Milestones gate Flows, for the golden tests. */
import { thaiEmployee } from "../fixtures/thai-employee"
import type { Baseline, Flow, Milestone, ReturnModel, Scenario, Timeline } from "../types"

const milestones: readonly Milestone[] = [
	{
		id: "recovered",
		combine: "all",
		criteria: [
			{
				id: "owed",
				kind: "metric",
				metric: "liabilities",
				op: "atMost",
				amount: 200_000_000,
				terms: "nominal",
			},
		],
	},
	{
		id: "buffered",
		combine: "all",
		criteria: [
			{ id: "after", kind: "date", on: "2027-01-01" },
			{
				id: "cash",
				kind: "metric",
				metric: { accounts: ["cash", "emergency-fund"] },
				op: "atLeast",
				amount: 45_000_000,
				terms: "real",
			},
		],
	},
	{
		id: "covered",
		combine: "any",
		criteria: [
			{
				id: "years",
				kind: "multiple",
				metric: "accessibleNetWorth",
				op: "atLeast",
				base: { expenses: "next12Months" },
				num: 1_000_000,
				den: 1,
				terms: "real",
			},
		],
	},
]

const gated: readonly Flow[] = [
	{
		id: "travel",
		kind: "expense",
		amount: 400_000,
		frequency: "monthly",
		start: "2026-01-01",
		growth: "inflation",
		startAt: "recovered",
	},
	{
		id: "lessons",
		kind: "expense",
		amount: 300_000,
		frequency: "monthly",
		start: "2026-01-01",
		growth: "inflation",
		endAt: "buffered",
	},
]

/** The Thai-employee Scenario to 2032, with the Milestones above and the two Flows they gate. */
export const goldenScenario: Scenario = {
	...thaiEmployee.scenario,
	flows: [...thaiEmployee.scenario.flows, ...gated],
	milestones,
}

export const goldenBaseline: Baseline = thaiEmployee.baseline
export const goldenTimeline: Timeline = {
	start: "2026-01-01",
	horizon: "2032-01-01",
	resolution: "month",
}

/** Two market months: three in four calm, one in four a sell-off. */
export const goldenModel: ReturnModel = {
	id: "golden",
	accounts: ["cash", "emergency-fund", "mortgage", "rmf"],
	buckets: [
		{ returnsBps: [20, 40, 0, 110], weight: 3221225472 },
		{ returnsBps: [-40, -60, 0, -120], weight: 1073741824 },
	],
}
