import { describe, expect, it } from "bun:test"
import { problemsOf, withCategory } from "./expense-category-support"

describe("an expense category is optional free text of 1 to 64 code points", () => {
	it("accepts a plain category", () => {
		expect(problemsOf(withCategory("Essentials"))).toEqual([])
	})

	it("accepts a category of exactly one character", () => {
		expect(problemsOf(withCategory("a"))).toEqual([])
	})

	it("accepts a category of exactly 64 characters", () => {
		expect(problemsOf(withCategory("a".repeat(64)))).toEqual([])
	})

	it("counts code points, not UTF-16 units: 64 emoji fit", () => {
		expect(problemsOf(withCategory("🙂".repeat(64)))).toEqual([])
	})

	it("refuses 65 code points as INVALID_CATEGORY at the category path", () => {
		expect(problemsOf(withCategory("a".repeat(65)))).toEqual([
			"scenario/flows/0/category INVALID_CATEGORY",
		])
	})

	it("refuses 65 emoji as INVALID_CATEGORY, not 130 units as too long for one", () => {
		expect(problemsOf(withCategory("🙂".repeat(65)))).toEqual([
			"scenario/flows/0/category INVALID_CATEGORY",
		])
	})

	it("refuses an empty category as INVALID_CATEGORY", () => {
		expect(problemsOf(withCategory(""))).toEqual(["scenario/flows/0/category INVALID_CATEGORY"])
	})

	it("refuses a line feed as INVALID_CATEGORY", () => {
		expect(problemsOf(withCategory("food\ncourt"))).toEqual([
			"scenario/flows/0/category INVALID_CATEGORY",
		])
	})

	it("refuses a C0 control character as INVALID_CATEGORY", () => {
		expect(problemsOf(withCategory("bell\u0007"))).toEqual([
			"scenario/flows/0/category INVALID_CATEGORY",
		])
	})

	it("refuses DEL as INVALID_CATEGORY", () => {
		expect(problemsOf(withCategory("x\u007f"))).toEqual([
			"scenario/flows/0/category INVALID_CATEGORY",
		])
	})

	it("refuses a C1 control character as INVALID_CATEGORY", () => {
		expect(problemsOf(withCategory("x\u0085"))).toEqual([
			"scenario/flows/0/category INVALID_CATEGORY",
		])
	})

	it("refuses a non-string category as WRONG_TYPE", () => {
		expect(problemsOf(withCategory(5))).toEqual(["scenario/flows/0/category WRONG_TYPE"])
	})
})

describe("only an expense Flow takes a category", () => {
	const kinds: Record<string, unknown>[] = [
		{
			id: "salary",
			kind: "income",
			earned: true,
			amount: 500,
			frequency: "monthly",
			start: "2026-02-01",
			growth: { bps: 0 },
		},
		{
			id: "savings",
			kind: "contribution",
			target: "loan",
			amount: 500,
			frequency: "monthly",
			start: "2026-02-01",
			growth: { bps: 0 },
		},
		{
			id: "borrow",
			kind: "withdrawal",
			source: "loan",
			amount: 500,
			frequency: "once",
			start: "2026-02-01",
			growth: { bps: 0 },
		},
	]

	it.each(kinds)("refuses a category on a $kind Flow as UNKNOWN_KEY", (flow) => {
		expect(problemsOf({ ...flow, category: "Essentials" })).toEqual([
			"scenario/flows/0/category UNKNOWN_KEY",
		])
	})
})
