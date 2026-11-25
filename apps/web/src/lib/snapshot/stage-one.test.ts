import { describe, expect, test } from "bun:test"
import { checkParams } from "./params"
import { planStageOne } from "./stage-one"

const params = checkParams({
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
})

describe("stage one", () => {
	test("reads the Scenarios, the accounts and net worth at the As-of, and nothing else", () => {
		if (!params.ok) throw new Error("the fixture parameters must hold")
		const plan = planStageOne(params.params)
		expect(plan.scenarios.argv).toEqual(["scenario", "list", "--json"])
		expect(plan.accounts.argv).toEqual(["account", "list", "--json"])
		expect(plan.netWorth.argv).toEqual(["report", "networth", "--as-of", "2026-10-31", "--json"])
	})

	test("takes no Carry-in, because it names no projection", () => {
		if (!params.ok) throw new Error("the fixture parameters must hold")
		const plan = planStageOne(params.params)
		for (const read of Object.values(plan)) expect(read.carryInFor).toEqual([])
	})
})
