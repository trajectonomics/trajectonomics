import { describe, expect, test } from "bun:test"
import type { GuidedMoneyRow } from "./money"
import {
	AMOUNT_PROBLEM,
	amountProblem,
	amountSent,
	draftsOf,
	KEEP_PROBLEM,
	keepProblem,
	type RowDrafts,
	totalProblem,
} from "./money-draft"

const SALARY: GuidedMoneyRow = {
	id: "salary",
	name: "Salary",
	type: "income",
	frequency: "monthly",
	amount: "50000.00",
	monthsText: "12 of 12 months",
}

const RENT: GuidedMoneyRow = {
	id: "rent",
	name: "Rent",
	type: "expense",
	frequency: "monthly",
	amount: "15000.00",
	monthsText: "12 of 12 months",
}

/** The drafts with one row changed, by id. */
function changed(drafts: RowDrafts, id: string, answer: Partial<RowDrafts[string]>): RowDrafts {
	return {
		...drafts,
		[id]: { ...(drafts[id] ?? { keep: true, amount: "", earned: true }), ...answer },
	}
}

describe("draftsOf", () => {
	test("starts every row kept, at the read's amount, with income earned", () => {
		expect(draftsOf([SALARY, RENT])).toEqual({
			salary: { keep: true, amount: "", earned: true },
			rent: { keep: true, amount: "", earned: true },
		})
	})
})

describe("amountSent", () => {
	test("takes the commas off, and nothing else", () => {
		expect(amountSent("52,000")).toBe("52000")
		expect(amountSent("12,500.50")).toBe("12500.50")
		expect(amountSent(" 12500")).toBe(" 12500")
	})

	test("sends nothing for the empty answer, which means the read's amount", () => {
		expect(amountSent("")).toBeUndefined()
	})
})

describe("amountProblem", () => {
	test("accepts an empty answer and the forms a person types", () => {
		for (const text of ["", "12500", "12500.5", "12500.50", "12,500"])
			expect(amountProblem(text)).toBeNull()
	})

	test("states the one problem for anything else", () => {
		for (const text of ["1.234", "12 500", "12,500.500", "abc", "-1", " "])
			expect(amountProblem(text)).toBe(AMOUNT_PROBLEM)
	})
})

describe("totalProblem", () => {
	test("requires both totals, as text an amount may take", () => {
		expect(totalProblem("40000")).toBeNull()
		expect(totalProblem("18,000.50")).toBeNull()
		expect(totalProblem("")).toBe(AMOUNT_PROBLEM)
		expect(totalProblem("18.000")).toBe(AMOUNT_PROBLEM)
	})
})

describe("keepProblem", () => {
	test("stops a plan whose every row is dropped", () => {
		const drafts = draftsOf([SALARY, RENT])
		expect(
			keepProblem(changed(changed(drafts, "salary", { keep: false }), "rent", { keep: false })),
		).toBe(KEEP_PROBLEM)
		expect(keepProblem(changed(drafts, "salary", { keep: false }))).toBeNull()
	})
})
