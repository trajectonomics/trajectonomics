import { describe, expect, test } from "bun:test"
import { demoSnapshotText } from "../../../scripts/demo-snapshot"
import { type ScenarioDocument, snapshot } from "../contract"
import { isFilerPlan } from "./allowance-params"
import { failedRead } from "./fixtures.test-support"
import { hasLevy } from "./levy"
import { checkParams, type PlanInput } from "./params"
import { planAllowances } from "./stage-two-allowances"

const INPUTS = {
	labels: ["allowance.retirement.rmf", "allowance.thai_esg"],
	step: "1000",
	budget: null,
	minSaving: null,
}

const input: PlanInput = {
	asOf: "2026-10-31",
	horizon: "2030-12-31",
	scenarios: [],
	compare: null,
	birthDate: null,
	ages: [],
	monthly: false,
	carryIn: false,
	returnModel: null,
	paths: null,
	seed: null,
	allowances: INPUTS,
}

function paramsOf(overrides: Partial<PlanInput>) {
	const result = checkParams({ ...input, ...overrides })
	if (!result.ok) throw new Error(`the parameters must hold: ${result.error.code}`)
	return result.params
}

describe("the allowance reads of the Plan", () => {
	test("each plan reads its allowances in the person's order with the step, and no limit that was not given", () => {
		const plan = planAllowances(paramsOf({}), ["base"])
		expect(plan["base"]?.argv).toEqual([
			"projection",
			"allowances",
			"--scenario=base",
			"--as-of",
			"2026-10-31",
			"--horizon",
			"2030-12-31",
			"--labels",
			"allowance.retirement.rmf,allowance.thai_esg",
			"--step",
			"1000",
			"--json",
		])
	})

	test("a budget and a least saving are passed as typed, and the Carry-in goes on standard input", () => {
		const params = paramsOf({
			carryIn: true,
			allowances: { ...INPUTS, budget: "50000", minSaving: "12.5" },
		})
		const read = planAllowances(params, ["base"])["base"]
		expect(read?.argv.slice(-7)).toEqual([
			"--step",
			"1000",
			"--budget",
			"50000",
			"--min-saving",
			"12.5",
			"--json",
		])
		expect(read?.argv).toContain("--carry-in")
		expect(read?.carryInFor).toEqual(["base"])
	})

	test("a name that starts with a dash is still one --scenario token", () => {
		expect(planAllowances(paramsOf({}), ["-x"])["-x"]?.argv).toContain("--scenario=-x")
	})

	test("with no inputs no allowance read is planned", () => {
		expect(planAllowances(paramsOf({ allowances: null }), ["base"])).toEqual({})
	})

	test.each([
		["no allowance chosen", { ...INPUTS, labels: [] }],
		["a label the Levy does not read", { ...INPUTS, labels: ["allowance.other"] }],
		// `readForFilers` adds the Filer's suffix after this schema takes the bare labels, so a suffixed one is refused.
		["a label with a Filer suffix", { ...INPUTS, labels: ["allowance.retirement.rmf@me"] }],
		["an allowance twice", { ...INPUTS, labels: [INPUTS.labels[0] ?? "", INPUTS.labels[0] ?? ""] }],
		["a step that is not a decimal", { ...INPUTS, step: "1,000" }],
		["a least saving over 100", { ...INPUTS, minSaving: "100.5" }],
		["a budget that is negative", { ...INPUTS, budget: "-1" }],
	])("%s is refused as invalid_allowances", (_name, allowances) => {
		const result = checkParams({ ...input, allowances })
		expect(result.ok).toBe(false)
		if (!result.ok) expect(result.error.code).toBe("invalid_allowances")
	})
})

describe("which plans are asked", () => {
	test("only a plan whose document holds a Levy; a failed document read asks none", () => {
		expect(hasLevy(failedRead(["scenario", "show"]))).toBe(false)
		expect(hasLevy(undefined)).toBe(false)
	})
})

describe("a joint Return over Filers", () => {
	const flows = (...labels: [kind: string, label?: string][]) =>
		({
			flows: labels.map(([kind, label], index) => ({
				id: `f${index}`,
				kind,
				frequency: "annual",
				start: "2026-01-01",
				...(label === undefined ? {} : { label }),
			})),
		}) as unknown as ScenarioDocument

	test("a plan whose income or contributions carry a Filer suffix is a Filer plan", () => {
		expect(isFilerPlan(flows(["contribution", "allowance.retirement.rmf@me"]))).toBe(true)
		expect(isFilerPlan(flows(["income", "income.section40_1@partner"]))).toBe(true)
		expect(isFilerPlan(flows(["income", "income.section40_1@shared"]))).toBe(true)
	})

	test("a Levy whose tally measures carry a Filer suffix makes it one, even with no labelled Flow", () => {
		const plan = {
			...flows(["income"]),
			levies: [{ id: "th-2026-pit", measures: [{ op: "tally", label: "income.section40_1@me" }] }],
		} as unknown as ScenarioDocument
		expect(isFilerPlan(plan)).toBe(true)
		const bare = {
			...flows(["income"]),
			levies: [{ id: "th-2026-pit", measures: [{ op: "tally", label: "income.section40_1" }] }],
		} as unknown as ScenarioDocument
		expect(isFilerPlan(bare)).toBe(false)
	})

	test("a bare label, no label, an unknown label or no document is not", () => {
		expect(isFilerPlan(flows(["contribution", "allowance.retirement.rmf"]))).toBe(false)
		expect(isFilerPlan(flows(["income"]))).toBe(false)
		expect(isFilerPlan(flows(["income", "salary@me"]))).toBe(false)
		expect(isFilerPlan(null)).toBe(false)
	})
})

describe("the Demo snapshot", () => {
	test("states the allowance inputs and one allowances read per plan with a Levy", async () => {
		const text = await demoSnapshotText()
		const demo = snapshot.parse(JSON.parse(text))
		expect(demo.params.allowances?.labels).toEqual(INPUTS.labels)
		expect(Object.keys(demo.reads.allowances).sort()).toEqual([
			"base",
			"joint",
			"retire-early",
			"separate",
		])
		for (const read of Object.values(demo.reads.allowances)) {
			expect(read.ok).toBe(true)
			expect(read.argv.slice(0, 2)).toEqual(["projection", "allowances"])
		}
		// A plan without Filers keeps its bare labels; a plan with Filers, separate or joint, reads each Filer's own.
		const base = demo.reads.allowances["base"]
		const separate = demo.reads.allowances["separate"]
		const joint = demo.reads.allowances["joint"]
		expect(base?.ok === true ? base.argv : []).toContain(
			"allowance.retirement.rmf,allowance.thai_esg",
		)
		const byFiler =
			"allowance.retirement.rmf@me,allowance.thai_esg@me,allowance.retirement.rmf@partner,allowance.thai_esg@partner"
		expect(separate?.ok === true ? separate.argv : []).toContain(byFiler)
		expect(joint?.ok === true ? joint.argv : []).toContain(byFiler)
	})
})
