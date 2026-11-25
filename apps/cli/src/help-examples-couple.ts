import { PROJECTION_SCENARIO } from "./projection/testing"

/*
 * The couple the `scenario tax` example files jointly (cli ADR-0075), kept apart from the setups
 * so `help-examples-setup.ts` states only what each leaf needs.
 */

/** The base plan with a second salary, the plan of two earners the joint-Return example taxes. */
export const COUPLE_SCENARIO: Record<string, unknown> = {
	...PROJECTION_SCENARIO,
	flows: [
		...PROJECTION_SCENARIO.flows,
		{
			id: "partner-salary",
			kind: "income",
			earned: true,
			amount: 6000000,
			frequency: "monthly",
			start: "2026-04-01",
			growth: "inflation",
		},
	],
}

/** The household that says whose each salary is, so the joint Return has two Filers. */
export const COUPLE_HOUSEHOLD: Record<string, unknown> = {
	schemaVersion: 2,
	people: [
		{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{ id: "partner", role: "partner", born: "1992-02", lifeExpectancy: 90 },
	],
	anchors: [],
	owners: [
		{ path: "flows.salary", person: "me" },
		{ path: "flows.partner-salary", person: "partner" },
	],
}

/** The setup of `scenario tax`: the couple's plan and household, stored beside the projection fixture. */
export const COUPLE_SETUP: {
	files: Record<string, string>
	steps: readonly (readonly string[])[]
} = {
	files: {
		"couple.json": JSON.stringify(COUPLE_SCENARIO),
		"couple-household.json": JSON.stringify(COUPLE_HOUSEHOLD),
	},
	steps: [
		["scenario", "apply", "couple", "--file", "couple.json"],
		["scenario", "household", "couple", "--file", "couple-household.json"],
	],
}
