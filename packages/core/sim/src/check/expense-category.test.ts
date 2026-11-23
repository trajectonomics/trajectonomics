import { describe, expect, it } from "bun:test"
import { check } from "./index"

const baseline = { schemaVersion: 1, balances: [{ account: "cash", amount: 0 }] }
const timeline = { start: "2026-01-01", horizon: "2027-01-01", resolution: "month" }
const accounts = [
	{ id: "cash", kind: "asset", rate: 0 },
	{ id: "loan", kind: "liability", rate: 600, compounding: "monthly" },
]
const EXPENSE = {
	id: "groceries",
	kind: "expense",
	amount: 500,
	frequency: "monthly",
	start: "2026-02-01",
	growth: { bps: 0 },
}

/** The problems of one Flow, as `path code` strings, so a duplicate shows as two equal lines. */
function problemsOf(flow: Record<string, unknown>): string[] {
	const scenario = {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts,
		flows: [flow],
		cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: ["cash"] },
	}
	return check(baseline, scenario, timeline).map(
		(problem) => `${problem.path.join("/")} ${problem.code}`,
	)
}

/** An expense with the given `category`, so the category is the only difference between cases. */
const withCategory = (category: unknown): Record<string, unknown> => ({
	...EXPENSE,
	category,
})

describe("an expense category is optional free text of 1 to 64 characters", () => {
	it("accepts a plain category", () => {
		expect(problemsOf(withCategory("Essentials"))).toEqual([])
	})

	it("accepts a category of exactly one character", () => {
		expect(problemsOf(withCategory("a"))).toEqual([])
	})

	it("accepts a category of exactly 64 characters", () => {
		expect(problemsOf(withCategory("a".repeat(64)))).toEqual([])
	})

	it("counts characters, not UTF-16 units: 64 emoji fit", () => {
		expect(problemsOf(withCategory("🙂".repeat(64)))).toEqual([])
	})

	it("refuses 65 characters as INVALID_CATEGORY at the category path", () => {
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
