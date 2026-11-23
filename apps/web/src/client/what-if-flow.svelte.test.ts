import { describe, expect, test } from "bun:test"
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

	test("a rule that becomes a level amount is a Removal and an Addition of the same id, since a Set cannot delete the rule", () => {
		whatIfSession.tryFlow("base", HASH, { stored: STORED, edited: RULE })
		whatIfSession.tryFlow("base", HASH, { stored: STORED, edited: LEVEL })
		expect(whatIfSession.whatIf?.sets).toEqual([])
		expect(whatIfSession.whatIf?.removals).toEqual(["flows.retirement-spending"])
		expect(whatIfSession.whatIf?.additions).toEqual([{ list: "flows", item: LEVEL }])
	})

	test("trying the rule again after a level amount starts from the plan's own, not from the level amount", () => {
		whatIfSession.tryFlow("base", HASH, { stored: STORED, edited: LEVEL })
		whatIfSession.tryFlow("base", HASH, { stored: STORED, edited: RULE })
		expect(whatIfSession.whatIf?.removals).toEqual([])
		expect(whatIfSession.whatIf?.additions).toEqual([])
		expect(whatIfSession.whatIf?.sets).toHaveLength(1)
	})

	test("another plan's pending changes ask first, as a switch does", () => {
		whatIfSession.setOff("base", HASH, "flows.gym", true)
		expect(whatIfSession.tryFlow("retire-early", HASH, { stored: undefined, edited: STORED })).toBe(
			false,
		)
		expect(whatIfSession.asking).toBe("retire-early")
	})
})
