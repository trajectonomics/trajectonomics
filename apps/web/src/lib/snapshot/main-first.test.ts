import { describe, expect, test } from "bun:test"
import { stageOne } from "./fixtures.test-support"
import { checkParams, type PlanInput } from "./params"
import { planStageTwo } from "./stage-two"

const input: PlanInput = {
	asOf: "2026-10-31",
	horizon: "2060-12-31",
	scenarios: [],
	compare: null,
	birthDate: null,
	ages: [],
	monthly: false,
	carryIn: false,
	returnModel: null,
	paths: null,
	seed: null,
}

function plan(scenarios: string[], main: string | null, names = ["alpha", "base", "zed"]) {
	const result = checkParams({ ...input, scenarios })
	if (!result.ok) throw new Error(result.error.code)
	const one = stageOne("2026-10-31", names)
	if (one.scenarios.ok) {
		for (const entry of one.scenarios.data.scenarios) entry.main = entry.name === main
	}
	return planStageTwo(result.params, one).scenarios
}

describe("the plans the Snapshot projects", () => {
	test("start with the main plan, and keep the order of the rest", () => {
		expect(plan([], "zed")).toEqual(["zed", "alpha", "base"])
		expect(plan([], "alpha")).toEqual(["alpha", "base", "zed"])
	})

	test("keep the ledger's order when no plan is main", () => {
		expect(plan([], null)).toEqual(["alpha", "base", "zed"])
	})

	test("put the main plan first in a list the person named, and only when it is in the list", () => {
		expect(plan(["base", "zed"], "zed")).toEqual(["zed", "base"])
		expect(plan(["base", "alpha"], "zed")).toEqual(["base", "alpha"])
	})
})
