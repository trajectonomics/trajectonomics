import { describe, expect, test } from "bun:test"
import type { ProjectionRun } from "../contract"
import { feesOverPlan, isAboveZero } from "./lifetime"

const run = (extra: Partial<ProjectionRun>): ProjectionRun =>
	({ currency: "THB", ...extra }) as ProjectionRun

describe("above zero, read from the contract's money text", () => {
	test("a figure with any digit but zero and no minus sign is above zero", () => {
		for (const amount of ["0.01", "1", "10.00", "1514.01", "100000000000000000000.00"])
			expect(isAboveZero(amount)).toBe(true)
	})

	test("zero in any spelling, and a negative figure, are not", () => {
		for (const amount of ["0", "0.00", "0.000", "-0.00", "-1.00", "-0.01"])
			expect(isAboveZero(amount)).toBe(false)
	})
})

describe("the fees over the plan a run states", () => {
	test("is the run's lifetimeFees as stated, with its currency", () => {
		expect(feesOverPlan(run({ lifetimeFees: "1514.01" }))).toEqual({
			amount: "1514.01",
			currency: "THB",
		})
	})

	test("is none when the run states none, states zero, or there is no run", () => {
		expect(feesOverPlan(run({}))).toBeNull()
		expect(feesOverPlan(run({ lifetimeFees: "0.00" }))).toBeNull()
		expect(feesOverPlan(null)).toBeNull()
		expect(feesOverPlan(undefined)).toBeNull()
	})
})
