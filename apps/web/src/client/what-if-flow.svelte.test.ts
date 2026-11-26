import { describe, expect, test } from "bun:test"
import { overridesOf } from "../lib/what-if/session"
import { whatIfSession } from "./what-if.svelte.js"
import { HASH, useSessionHooks } from "./what-if.test-support"

useSessionHooks()

const STORED = {
	id: "retirement-spending",
	kind: "expense",
	frequency: "monthly",
	start: "2026-10-31",
	startAt: "retire",
	rule: { kind: "guardrails", portfolio: ["cash"], rateBps: "4.00", rounding: "floor" },
}
const RULE = { ...STORED, rule: { ...STORED.rule, rateBps: "3.50" } }
const LEVEL = {
	id: "retirement-spending",
	kind: "expense",
	frequency: "annual",
	start: "2026-10-31",
	startAt: "retire",
	amount: "40000.00",
	growth: "inflation",
}

describe("trying a field the stored Flow lacks", () => {
	const RENT = {
		id: "rent",
		kind: "expense",
		frequency: "monthly",
		start: "2026-11-01",
		amount: "5000.00",
	}
	for (const [field, value] of [
		["end", "2030-01-01"],
		["category", "housing"],
		["displayLabel", "Rent"],
	] as const) {
		test(`a first ${field} is one Set of the whole Flow`, () => {
			whatIfSession.tryFlow("base", HASH, { stored: RENT, edited: { ...RENT, [field]: value } })
			expect(whatIfSession.whatIf?.sets).toEqual([
				{ path: "flows.rent", value: { ...RENT, [field]: value } },
			])
		})
	}

	test("a whole-item Set clears a field the form cleared, so nothing is reported as untried", () => {
		const stored = { ...RENT, category: "housing" }
		const edited = { ...RENT, end: "2030-01-01" }
		expect(whatIfSession.tryFlow("base", HASH, { stored, edited })).toBe(true)
		expect(whatIfSession.whatIf?.sets).toEqual([{ path: "flows.rent", value: edited }])
	})
})

describe("switching a Flow off", () => {
	test("holds its try out of what traj reads, and a switch back on restores it", () => {
		whatIfSession.tryFlow("base", HASH, { stored: STORED, edited: LEVEL })
		expect(whatIfSession.whatIf?.sets).toEqual([
			{ path: "flows.retirement-spending", value: LEVEL },
		])
		whatIfSession.setOff("base", HASH, "flows.retirement-spending", true)
		// The Set stays in the session, held back: `traj` refuses a Set of a Flow a Removal took out.
		expect(whatIfSession.whatIf?.sets).toEqual([
			{ path: "flows.retirement-spending", value: LEVEL },
		])
		expect(whatIfSession.whatIf?.removals).toEqual(["flows.retirement-spending"])
		expect(overridesOf(whatIfSession.whatIf!).sets).toEqual([])
		whatIfSession.setOff("base", HASH, "flows.retirement-spending", false)
		expect(overridesOf(whatIfSession.whatIf!).sets).toEqual([
			{ path: "flows.retirement-spending", value: LEVEL },
		])
	})

	test("takes a salary's employer share with it as one group, and the bar's chip switches both back on", () => {
		const spec = {
			kind: "salary" as const,
			name: "salary",
			paths: ["flows.salary", "flows.salary-employer"],
		}
		whatIfSession.setOff("base", HASH, "flows.gym", true)
		expect(whatIfSession.setGroupOff("base", HASH, spec, spec.paths, true)).toBe(true)
		expect(whatIfSession.whatIf?.removals).toEqual([
			"flows.gym",
			"flows.salary",
			"flows.salary-employer",
		])
		expect(whatIfSession.isGroupOffIn("base", spec)).toBe(true)
		expect(whatIfSession.changes.map((change) => change.label)).toEqual([
			"Gym switched off",
			"Salary and its employer share switched off",
		])
		const change = whatIfSession.changes.find((one) => one.kind === "group")
		if (change === undefined) throw new Error("no group change")
		whatIfSession.removeChange(change)
		expect(whatIfSession.whatIf?.removals).toEqual(["flows.gym"])
		expect(whatIfSession.whatIf?.groups).toEqual([])
	})
})

describe("trying a spending Flow as a what-if", () => {
	test("a Flow the plan does not hold is an Addition", () => {
		expect(whatIfSession.tryFlow("base", HASH, { stored: undefined, edited: STORED })).toBe(true)
		expect(whatIfSession.whatIf?.additions).toEqual([{ list: "flows", item: STORED }])
		expect(whatIfSession.whatIf?.removals).toEqual([])
	})

	test("the same kind of rule is a Set of its changed fields, and a later try replaces an earlier one", () => {
		whatIfSession.tryFlow("base", HASH, { stored: STORED, edited: RULE })
		expect(whatIfSession.whatIf?.sets).toEqual([
			{ path: "flows.retirement-spending.rule", value: RULE.rule },
		])
		whatIfSession.tryFlow("base", HASH, {
			stored: STORED,
			edited: { ...RULE, rule: { ...RULE.rule, rateBps: "3.00" } },
		})
		expect(whatIfSession.whatIf?.sets).toHaveLength(1)
		expect(whatIfSession.whatIf?.sets[0]?.value).toMatchObject({ rateBps: "3.00" })
	})

	test("a rule that becomes a level amount is one Set of the whole Flow, never a Removal with an Addition of the same id", () => {
		whatIfSession.tryFlow("base", HASH, { stored: STORED, edited: RULE })
		whatIfSession.tryFlow("base", HASH, { stored: STORED, edited: LEVEL })
		expect(whatIfSession.whatIf?.sets).toEqual([
			{ path: "flows.retirement-spending", value: LEVEL },
		])
		expect(whatIfSession.whatIf?.removals).toEqual([])
		expect(whatIfSession.whatIf?.additions).toEqual([])
	})

	test("a field the stored Flow lacks (a stop) is one Set of the whole Flow", () => {
		const rent = {
			id: "rent",
			kind: "expense",
			frequency: "monthly",
			start: "2026-10-31",
			amount: "5000.00",
		}
		const stopped = { ...rent, endAt: "retire" }
		whatIfSession.tryFlow("base", HASH, { stored: rent, edited: stopped })
		expect(whatIfSession.whatIf?.sets).toEqual([{ path: "flows.rent", value: stopped }])
	})

	test("trying the rule again after a level amount starts from the plan's own, not from the level amount", () => {
		whatIfSession.tryFlow("base", HASH, { stored: STORED, edited: LEVEL })
		whatIfSession.tryFlow("base", HASH, { stored: STORED, edited: RULE })
		expect(whatIfSession.whatIf?.removals).toEqual([])
		expect(whatIfSession.whatIf?.additions).toEqual([])
		expect(whatIfSession.whatIf?.sets.map((set) => set.path)).toEqual([
			"flows.retirement-spending.rule",
		])
	})

	test("another plan's pending changes ask first, as a switch does", () => {
		whatIfSession.setOff("base", HASH, "flows.gym", true)
		expect(whatIfSession.tryFlow("retire-early", HASH, { stored: undefined, edited: STORED })).toBe(
			false,
		)
		expect(whatIfSession.asking).toBe("retire-early")
	})
})
