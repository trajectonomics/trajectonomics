import { describe, expect, test } from "bun:test"
import type { NetWorthAt } from "./rows"
import { monthly, netWorthRead } from "./rows.test-support"
import { netWorthLabel, offsetWords, rollupSentence, sideSentence } from "./words"

/** The period each page reads against, as the page's own shape: a roll-up, a tax year, a Rule year's row. */
const PERIOD = {
	cashflow: { from: "2026-10-31", to: "2027-10-30" },
	tax: { from: "2026-01-01", to: "2026-12-31" },
	rule: { date: "2050-06-01" },
} as const

const THB = [{ currency: "THB", amount: "1214900.00" }]

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

describe("the Net worth page's focus label for a viewing month", () => {
	const PLAN = { name: "base", currency: "THB" }

	test("today keeps the page's question, the totals and the As-of", () => {
		const at = { kind: "today", read: netWorthRead("2026-10-31", THB) } as const
		expect(netWorthLabel(at, "2026-10", PLAN, false)).toBe(
			"What are you worth today? 1.21M THB as of 31 Oct 2026.",
		)
	})

	test("a past month asks what you were worth at its end, and states every currency total", () => {
		const read = netWorthRead("2025-03-31", [
			{ currency: "THB", amount: "1020000.00" },
			{ currency: "USD", amount: "33400.00" },
		])
		const at = { kind: "past", read } as const
		expect(netWorthLabel(at, "2025-03", PLAN, false)).toBe(
			"What were you worth at the end of Mar 2025? 1.02M THB, 33.4k USD as of 31 Mar 2025.",
		)
	})

	test("a future month states the monthly row in the plan's currency, at the row's own date", () => {
		const at = { kind: "future", row: monthly("2031-03-31", "3400000.00") } as const
		expect(netWorthLabel(at, "2031-03", PLAN, false)).toBe(
			"What will you be worth at the end of Mar 2031? 3.4M THB on 31 Mar 2031, in the plan base.",
		)
	})

	test("a month after the plan ran out names the plan and the run-out date", () => {
		const at = { kind: "ranOut", date: "2053-02-01" } as const
		const plan = { name: "retire-early", currency: "THB" }
		expect(netWorthLabel(at, "2053-03", plan, false)).toBe(
			"What will you be worth in Mar 2053? The plan retire-early runs out on 1 Feb 2053.",
		)
	})

	test("Hide amounts hides the figure, and the exact amount is never written", () => {
		const at = { kind: "future", row: monthly("2031-03-31", "3400000.00") } as const
		expect(netWorthLabel(at, "2031-03", PLAN, true)).toBe(
			"What will you be worth at the end of Mar 2031? The amount is hidden. On 31 Mar 2031, in the plan base.",
		)
		expect(
			netWorthLabel({ kind: "past", read: netWorthRead("2025-03-31", THB) }, "2025-03", PLAN, true),
		).toBe("What were you worth at the end of Mar 2025? The amount is hidden. As of 31 Mar 2025.")
	})

	test("no row, a failed Read and a Read with no total have no label, so the page shows its own notice", () => {
		expect(netWorthLabel({ kind: "missing" }, "2031-03", PLAN, false)).toBeNull()
		const failed: NetWorthAt = {
			kind: "today",
			read: { argv: [], ok: false, error: { code: "x", exitCode: 1, message: "x" } },
		}
		expect(netWorthLabel(failed, "2026-10", PLAN, false)).toBeNull()
		const noTotals = { kind: "today", read: netWorthRead("2026-10-31", null) } as const
		expect(netWorthLabel(noTotals, "2026-10", PLAN, false)).toBeNull()
	})
})
