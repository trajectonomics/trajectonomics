import { describe, expect, test } from "bun:test"
import { rereadSchema } from "./reread"

const INPUTS = { labels: ["allowance.retirement.rmf"], step: "1000", budget: null, minSaving: null }

describe("the reread body", () => {
	test("is empty to read again as it is, or states the allowance inputs, or null to clear them", () => {
		expect(rereadSchema.safeParse({}).success).toBe(true)
		expect(rereadSchema.safeParse({ allowances: INPUTS }).success).toBe(true)
		expect(rereadSchema.safeParse({ allowances: null }).success).toBe(true)
	})

	test.each([
		["another field", { allowances: INPUTS, kind: "delete-plan" }],
		["an allowance the Levy does not read", { allowances: { ...INPUTS, labels: ["x"] } }],
		["a step that is not a decimal", { allowances: { ...INPUTS, step: "--help" } }],
		["a field inside the inputs", { allowances: { ...INPUTS, extra: 1 } }],
	])("refuses %s", (_name, body) => {
		expect(rereadSchema.safeParse(body).success).toBe(false)
	})
})

describe("the reread body that reads one path", () => {
	test("is a plan and an index, alone", () => {
		expect(rereadSchema.safeParse({ path: { plan: "base", index: 3 } }).success).toBe(true)
	})

	test.each([
		["with the allowance inputs", { path: { plan: "base", index: 3 }, allowances: null }],
		[
			"with the chance inputs",
			{ path: { plan: "base", index: 3 }, chance: { paths: 10, seed: "0123456789abcdef" } },
		],
		["with a flag as the plan", { path: { plan: "--help", index: 3 } }],
		["with an index past the CLI's limit", { path: { plan: "base", index: 10000 } }],
		["with another field inside", { path: { plan: "base", index: 3, argv: ["x"] } }],
	])("refuses a path %s", (_name, body) => {
		expect(rereadSchema.safeParse(body).success).toBe(false)
	})
})
