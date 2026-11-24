import { describe, expect, test } from "bun:test"
import type { Edit } from "./edit"
import { followPlan } from "./follow"

describe("followPlan", () => {
	test("a copy or an apply joins an explicit list, and an empty list stays every Scenario", () => {
		const copy: Edit = {
			kind: "copy-plan",
			from: "base",
			name: "early",
			sets: [],
			removals: [],
			additions: [],
		}
		expect(followPlan(["base"], copy)).toEqual(["base", "early"])
		expect(followPlan([], copy)).toEqual([])
		expect(followPlan(["base", "early"], copy)).toEqual(["base", "early"])
	})

	test("a delete leaves the list without its name", () => {
		expect(followPlan(["base", "early"], { kind: "delete-plan", name: "early" })).toEqual(["base"])
		expect(followPlan([], { kind: "delete-plan", name: "early" })).toEqual([])
	})
})
