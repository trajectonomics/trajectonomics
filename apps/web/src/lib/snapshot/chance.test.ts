import { describe, expect, test } from "bun:test"
import { stageOne } from "./fixtures.test-support"
import { leafOf } from "./leaves"
import { checkParams, type PlanInput } from "./params"
import { planStageTwo } from "./stage-two"

const base: PlanInput = {
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

const CHANCE = { returnModel: "model.json", paths: 200, seed: "0123456789abcdef" }

function codeOf(overrides: Partial<PlanInput>): string | null {
	const result = checkParams({ ...base, ...overrides })
	return result.ok ? null : result.error.code
}

describe("the chance flags", () => {
	test("paths and seed are both or neither: a partial set is refused by its own rule", () => {
		expect(codeOf({ returnModel: "model.json" })).toBe("chance_needs_paths_and_seed")
		expect(codeOf({ returnModel: "model.json", paths: 200 })).toBe("chance_needs_paths_and_seed")
		expect(codeOf({ paths: 200 })).toBe("chance_needs_paths_and_seed")
		expect(codeOf({ seed: "0123456789abcdef" })).toBe("chance_needs_paths_and_seed")
	})

	test("without a Return model file, paths and seed read the plan's own model, as traj dashboard does", () => {
		const result = checkParams({ ...base, paths: 200, seed: "0123456789abcdef" })
		expect(result.ok && result.params.chance).toEqual({
			returnModel: "plan",
			paths: 200,
			seed: "0123456789abcdef",
		})
	})

	test("the three together state the chance plan, and none states none", () => {
		const result = checkParams({ ...base, ...CHANCE })
		expect(result.ok && result.params.chance).toEqual(CHANCE)
		const none = checkParams(base)
		expect(none.ok && none.params.chance).toBeNull()
	})

	test("paths must be 1 to 10,000, the seed sixteen lower-case hex digits, and the model a file", () => {
		expect(codeOf({ ...CHANCE, paths: 0 })).toBe("invalid_paths")
		expect(codeOf({ ...CHANCE, paths: 10001 })).toBe("invalid_paths")
		expect(codeOf({ ...CHANCE, seed: "0123456789ABCDEF" })).toBe("invalid_seed")
		expect(codeOf({ ...CHANCE, seed: "0123" })).toBe("invalid_seed")
		expect(codeOf({ ...CHANCE, returnModel: "-" })).toBe("invalid_return_model")
	})
})

describe("the chance reads the Plan emits", () => {
	test("one projection chance per projected Scenario, with the Return model's path and the seed", () => {
		const params = checkParams({ ...base, ...CHANCE, scenarios: ["base", "retire-early"] })
		if (!params.ok) throw new Error(params.error.message)
		const plan = planStageTwo(params.params, stageOne("2026-10-31", ["base", "retire-early"]))
		expect(Object.keys(plan.chance)).toEqual(["base", "retire-early"])
		expect(plan.chance["base"]?.argv).toEqual([
			"projection",
			"chance",
			"--scenario=base",
			"--as-of",
			"2026-10-31",
			"--horizon",
			"2060-12-31",
			"--return-model=model.json",
			"--paths=200",
			"--seed=0123456789abcdef",
			"--outcomes",
			"--json",
		])
		expect(plan.chance["base"]?.carryInFor).toEqual([])
	})

	test("asks for Milestone dates only on a plan that declares Milestones (cli ADR-0081)", () => {
		const params = checkParams({ ...base, ...CHANCE, scenarios: ["base", "retire-early"] })
		if (!params.ok) throw new Error(params.error.message)
		const one = stageOne("2026-10-31", ["base", "retire-early"])
		if (one.scenarios.ok) one.scenarios.data.scenarios[0]!.hasMilestones = true
		const plan = planStageTwo(params.params, one)
		expect(plan.chance["base"]?.argv).toContain("--milestone-dates")
		expect(plan.chance["retire-early"]?.argv).not.toContain("--milestone-dates")
	})

	test("asks for the outcomes of every path, unless the parameters leave the futures out, as the Demo snapshot's do", () => {
		const left = checkParams({ ...base, ...CHANCE, futures: false, scenarios: ["base"] })
		if (!left.ok) throw new Error(left.error.message)
		const plan = planStageTwo(left.params, stageOne("2026-10-31", ["base"]))
		expect(plan.chance["base"]?.argv).not.toContain("--outcomes")
	})

	test("reads the representative paths in advance only when the parameters say so, as the offline Snapshot's do", () => {
		const plan = (readPaths: boolean | undefined) => {
			const checked = checkParams({ ...base, ...CHANCE, scenarios: ["base"], readPaths })
			if (!checked.ok) throw new Error(checked.error.message)
			return planStageTwo(checked.params, stageOne("2026-10-31", ["base"]))
		}
		expect(plan(undefined).readPaths).toBe(false)
		expect(plan(false).readPaths).toBe(false)
		expect(plan(true).readPaths).toBe(true)
	})

	test("takes the Carry-in on standard input for each Scenario, as a projection run does", () => {
		const params = checkParams({ ...base, ...CHANCE, carryIn: true, scenarios: ["base"] })
		if (!params.ok) throw new Error(params.error.message)
		const plan = planStageTwo(params.params, stageOne("2026-10-31", ["base"]))
		expect(plan.chance["base"]?.argv).toContain("--carry-in")
		expect(plan.chance["base"]?.carryInFor).toEqual(["base"])
	})

	test("plans none without the three flags, and every chance argv starts with an allowlisted leaf", () => {
		const none = checkParams(base)
		if (!none.ok) throw new Error(none.error.message)
		expect(planStageTwo(none.params, stageOne("2026-10-31", ["base"])).chance).toEqual({})
		const params = checkParams({ ...base, ...CHANCE })
		if (!params.ok) throw new Error(params.error.message)
		const plan = planStageTwo(params.params, stageOne("2026-10-31", ["base"]))
		for (const read of Object.values(plan.chance))
			expect(leafOf(read.argv)).toBe("projection chance")
	})
})
