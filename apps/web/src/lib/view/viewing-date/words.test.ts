import { describe, expect, test } from "bun:test"
import { offsetWords, rollupSentence, sideSentence } from "./words"

/** The period each page reads against, as the page's own shape: a roll-up, a tax year, a Rule year's row. */
const PERIOD = {
	cashflow: { from: "2026-10-31", to: "2027-10-30" },
	tax: { from: "2026-01-01", to: "2026-12-31" },
	rule: { date: "2050-06-01" },
} as const

describe("how far a month is from the As-of", () => {
	test("today, a month either way, and whole years at each twelfth month", () => {
		expect(offsetWords(0)).toBe("today")
		expect(offsetWords(1)).toBe("in 1 month")
		expect(offsetWords(3)).toBe("in 3 months")
		expect(offsetWords(-1)).toBe("1 month ago")
		expect(offsetWords(-2)).toBe("2 months ago")
		expect(offsetWords(12)).toBe("in 1 year")
		expect(offsetWords(24)).toBe("in 2 years")
		expect(offsetWords(-24)).toBe("2 years ago")
	})

	test("a count that is not a whole year stays in months", () => {
		expect(offsetWords(13)).toBe("in 13 months")
		expect(offsetWords(-14)).toBe("14 months ago")
	})
})

describe("the sentence of a month before its first period", () => {
	test("Cash flow says the plan starts after the month", () => {
		expect(sideSentence("cashflow", "before", "2025-03", PERIOD.cashflow, "2053-12-31")).toBe(
			"Mar 2025 is before the plan starts, so this is its first year.",
		)
	})

	test("Tax says which year it projects from", () => {
		expect(sideSentence("tax", "before", "2025-12", PERIOD.tax, "2053-12-31")).toBe(
			"Tax is projected from 2026, so this is 2026.",
		)
	})

	test("Withdrawals says when the rule starts", () => {
		expect(sideSentence("rule", "before", "2026-10", PERIOD.rule, "2053-12-31")).toBe(
			"The rule starts in Jun 2050, so this is its first year.",
		)
	})
})

describe("the sentence of a month after the plan, on every page", () => {
	for (const page of ["cashflow", "tax", "rule"] as const) {
		test(`${page} says a run-out on its date`, () => {
			expect(sideSentence(page, "ranOut", "2053-03", PERIOD[page], "2053-02-01")).toBe(
				"The plan runs out on 1 Feb 2053, so this is its last year.",
			)
		})

		test(`${page} says the plan's end on its date`, () => {
			expect(sideSentence(page, "after", "2053-12", PERIOD[page], "2053-12-31")).toBe(
				"The plan ends on 31 Dec 2053, so this is its last year.",
			)
		})

		test(`${page} says nothing for a month inside the period`, () => {
			expect(sideSentence(page, "in", "2030-06", PERIOD[page], "2053-12-31")).toBeNull()
		})
	}
})

describe("the Cash flow sentence for a month inside a roll-up", () => {
	test("names the roll-up's own range, which runs from the As-of's anniversary", () => {
		expect(rollupSentence("2031-03", "2030-10-31", "2031-10-30")).toBe(
			"Mar 2031 is in the year from 31 Oct 2030 to 30 Oct 2031.",
		)
	})
})
