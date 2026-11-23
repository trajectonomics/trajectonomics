import { makeFixture } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import { homeSetup } from "../fixtures/home-setup"
import type { Milestone } from "../types"
import type { ParityCase } from "./parity-cases"

const marked = { id: "home", kind: "asset", rate: 0, liquid: false } as const
const unmarked = { id: "home", kind: "asset", rate: 0 } as const

/** The home plan with a Milestone that reads accessible net worth on the 1st of each month. */
const base = makeFixture(homeSetup(marked))
const withMilestone: Fixture = {
	...base,
	scenario: {
		...base.scenario,
		milestones: [
			{
				id: "invested",
				combine: "all",
				criteria: [
					{
						id: "c",
						kind: "metric",
						metric: "accessibleNetWorth",
						op: "atLeast",
						amount: 500,
						terms: "nominal",
					},
				],
			} satisfies Milestone,
		],
	},
}

/** Illiquid home cases: a marked home moves the FI month, an unmarked one keeps today's answer. */
export const REAL_ASSET_PARITY_CASES: readonly ParityCase[] = [
	{
		name: "real-asset-home-fi",
		fixture: makeFixture(homeSetup(marked)),
		options: { method: "survival", minBufferMonths: 1 },
	},
	{
		name: "real-asset-unmarked-fi",
		fixture: makeFixture(homeSetup(unmarked)),
		options: { method: "survival", minBufferMonths: 1 },
	},
	{ name: "real-asset-home-milestone", fixture: withMilestone },
]
