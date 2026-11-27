import { describe, expect, test } from "bun:test"
import type { PlanParams } from "../snapshot"
import type { Edit } from "./edit"
import { followEdit, followPlan } from "./follow"

/** The Plan's parameters an Edit starts from: one plan shown, and a comparison of two. */
const PARAMS: PlanParams = {
	asOf: "2026-10-31",
	horizon: "2060-12-31",
	scenarios: ["base"],
	compare: { a: "base", b: "early" },
	birthDate: null,
	ages: [],
	monthly: false,
	carryIn: false,
	chance: null,
	allowances: null,
	futures: true,
	readPaths: false,
}

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

describe("followEdit", () => {
	test("adds a copy's name to an explicit list, and leaves the dates as they were", () => {
		const copy: Edit = {
			kind: "copy-plan",
			from: "base",
			name: "fresh",
			sets: [],
			removals: [],
			additions: [],
		}
		const following = followEdit(PARAMS, copy)
		expect(following.scenarios).toEqual(["base", "fresh"])
		expect(following.asOf).toBe("2026-10-31")
		expect(following.horizon).toBe("2060-12-31")
	})

	test("carries a rename into the comparison", () => {
		const rename: Edit = {
			kind: "rename-plan",
			name: "early",
			newName: "later",
			contentHash: `jcs1:sha256:${"ab".repeat(32)}`,
		}
		expect(followEdit(PARAMS, rename).compare).toEqual({ a: "base", b: "later" })
	})
})
