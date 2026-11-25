import { describe, expect, test } from "bun:test"
import { checkParams, type PlanInput } from "./params"

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

function codeOf(input: PlanInput): string | null {
	const result = checkParams(input)
	return result.ok ? null : result.error.code
}

describe("plan parameters", () => {
	test("valid dates and no optional parameters pass", () => {
		expect(codeOf(base)).toBeNull()
	})

	test("an As-of is required, and must be a date that exists", () => {
		expect(codeOf({ ...base, asOf: null })).toBe("as_of_required")
		expect(codeOf({ ...base, asOf: "2026-02-30" })).toBe("invalid_as_of")
	})

	test("a horizon is required, must exist, and may not come before the As-of", () => {
		expect(codeOf({ ...base, horizon: null })).toBe("horizon_required")
		expect(codeOf({ ...base, horizon: "2026-99-01" })).toBe("invalid_horizon")
		expect(codeOf({ ...base, horizon: "2026-10-30" })).toBe("horizon_before_as_of")
	})

	test("a horizon equal to the As-of is accepted", () => {
		expect(codeOf({ ...base, horizon: "2026-10-31" })).toBeNull()
	})

	test("ages need a birth date, and each must be a whole number from 0", () => {
		expect(codeOf({ ...base, ages: [45] })).toBe("age_needs_birth_date")
		expect(codeOf({ ...base, ages: [-1], birthDate: "1990-05-15" })).toBe("invalid_age")
		expect(codeOf({ ...base, ages: [45.5], birthDate: "1990-05-15" })).toBe("invalid_age")
		expect(codeOf({ ...base, ages: [45, 60], birthDate: "1990-05-15" })).toBeNull()
	})

	test("a birth date must be a date that exists", () => {
		expect(codeOf({ ...base, birthDate: "1990-02-29" })).toBe("invalid_birth_date")
	})

	test("a compare needs two names", () => {
		expect(codeOf({ ...base, compare: { a: "base", b: "" } })).toBe("compare_needs_two_names")
	})
})
