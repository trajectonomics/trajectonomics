import type { Household } from "./scenario/household/model"
import {
	applyScenario,
	resultOf,
	rowOf,
	type ScenarioBody,
	scenario,
} from "./scenario-test-support"
import { SCENARIO_DOCUMENT } from "./store/testing"
import type { Captured } from "./test-support"

export const HOLDER = { id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 } as const
export const PARTNER = {
	id: "partner",
	role: "partner",
	born: "1992-02",
	lifeExpectancy: 90,
	joins: "2028-01",
} as const

/** The holder's salary ends at 60; the partner's bonus ends at 60, a leap-year date. */
export const HOUSEHOLD: Household = {
	schemaVersion: 1,
	people: [HOLDER, PARTNER],
	anchors: [
		{ path: "flows.salary.end", person: "me", age: 60 },
		{ path: "flows.bonus.end", person: "partner", age: 60 },
	],
}

/** The Scenario a show prints: its row, its document, and its household, or null. */
export type Shown = ScenarioBody & {
	household: Record<string, unknown> | null
	document: Record<string, unknown> & { flows: Record<string, unknown>[] }
}

/** `traj scenario household base --file -`, with the household as the document. */
export function setHousehold(
	home: string,
	household: unknown,
	extra: readonly string[] = [],
): Promise<Captured> {
	return scenario(home, ["household", "base", "--file", "-", ...extra], JSON.stringify(household))
}

/** Creates the base Scenario, the document the fixture holds unless another is given. */
export async function seedBase(
	home: string,
	document: unknown = SCENARIO_DOCUMENT,
): Promise<ScenarioBody> {
	return rowOf(resultOf(await applyScenario(home, "base", document)))
}

/** `scenario show`, as the Scenario it prints. */
export async function shown(home: string, name = "base"): Promise<Shown> {
	return resultOf(await scenario(home, ["show", name])).scenario
}
