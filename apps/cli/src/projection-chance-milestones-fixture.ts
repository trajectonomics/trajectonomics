import type { Milestone, Scenario } from "@trajectonomics/core/sim"
import { PROJECTION_SCENARIO, projectionHome } from "./projection/testing"
import type { Household } from "./scenario/household/model"
import { applyScenario, scenario } from "./scenario-test-support"

export const HORIZON = "2032-03-30"

/** A date Milestone, an age Milestone (anchored), a metric Milestone and one no future reaches. */
const MILESTONES: Milestone[] = [
	{
		id: "stop",
		displayLabel: "stop work",
		combine: "all",
		criteria: [{ id: "when", kind: "date", on: "2026-09-30" }],
	},
	{
		id: "retire",
		displayLabel: "retire",
		combine: "all",
		criteria: [{ id: "when", kind: "date", on: "2030-01-01" }],
	},
	{
		id: "rich",
		displayLabel: "rich",
		combine: "all",
		criteria: [
			{
				id: "worth",
				kind: "metric",
				metric: "netWorth",
				op: "atLeast",
				amount: 450_000_000,
				terms: "nominal",
			},
		],
	},
	{
		id: "never",
		displayLabel: "never",
		combine: "all",
		criteria: [
			{
				id: "worth",
				kind: "metric",
				metric: "netWorth",
				op: "atLeast",
				amount: 1_000_000_000_000,
				terms: "nominal",
			},
		],
	},
]

const HOUSEHOLD: Household = {
	schemaVersion: 1,
	people: [
		{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{
			id: "partner",
			role: "partner",
			born: "1992-02",
			lifeExpectancy: 90,
			joins: "2030-01",
		},
	],
	anchors: [{ path: "milestones.retire.criteria.when.on", person: "me", age: 37 }],
}

/** The same household with a child born in the `retire` fire month, so they are 0 by its end. */
const DEPENDENT_HOUSEHOLD: Household = {
	...HOUSEHOLD,
	people: [
		...HOUSEHOLD.people,
		{ id: "mali", role: "dependent", relation: "child", born: "2027-06", lifeExpectancy: 90 },
	],
}

const PLAN: Scenario = { ...PROJECTION_SCENARIO, milestones: MILESTONES }

async function holderHome(household: Household): Promise<string> {
	const home = await projectionHome()
	const applied = await applyScenario(home, "milestoned", PLAN)
	if (applied.code !== 0) throw new Error(applied.err)
	const set = await scenario(
		home,
		["household", "milestoned", "--file", "-"],
		JSON.stringify(household),
	)
	if (set.code !== 0) throw new Error(set.err)
	return home
}

export function milestonedHome(): Promise<string> {
	return holderHome(HOUSEHOLD)
}

export function milestonedDependentHome(): Promise<string> {
	return holderHome(DEPENDENT_HOUSEHOLD)
}
