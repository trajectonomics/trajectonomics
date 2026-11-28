import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import type { Fixture } from "../fixtures/fixture"
import type { Projection, ProjectionOptions } from "../types"
import { identitySides } from "./cashflow-check"
import { oneDay, partialEnds, runOutMonth, underAMonth } from "./reporting-cases"
import { span } from "./reporting-check"

function projected(fixture: Fixture, options: ProjectionOptions): Projection {
	const result = project(fixture.baseline, fixture.scenario, fixture.timeline, options)
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.projection
}

function months(
	fixture: Fixture,
	yearStart: number,
	monthsOf: number | "first" | "all",
): Projection["cashflowMonths"] {
	return projected(fixture, { reporting: { yearStart, monthsOf } }).cashflowMonths
}

function years(fixture: Fixture, yearStart: number): Projection["cashflowYears"] {
	return projected(fixture, { reporting: { yearStart, years: true } }).cashflowYears
}

/**
 * Case A, hand-worked: 1000 lands on 30 November, 30 December and 30 January; 600 is drawn on 1
 * December, 1 January and 1 February. The As-of is 15 November and the horizon 10 February.
 * A month's surplus is 1000 after a pay day and empty when only rent lands; December and January
 * draw 600 and keep 1000, February draws 600 alone.
 */
const A_MONTHS = [
	span(2026, "2026-11-15", "2026-11-30", true, {
		income: [{ flow: "pay", amount: 1000 }],
		surplus: [{ account: "cash", amount: 1000 }],
	}),
	span(2026, "2026-12-01", "2026-12-31", false, {
		income: [{ flow: "pay", amount: 1000 }],
		expenses: [{ flow: "rent", amount: 600 }],
		categories: [{ category: null, amount: 600 }],
		drawn: [{ account: "cash", amount: 600 }],
		surplus: [{ account: "cash", amount: 1000 }],
	}),
	span(2027, "2027-01-01", "2027-01-31", false, {
		income: [{ flow: "pay", amount: 1000 }],
		expenses: [{ flow: "rent", amount: 600 }],
		categories: [{ category: null, amount: 600 }],
		drawn: [{ account: "cash", amount: 600 }],
		surplus: [{ account: "cash", amount: 1000 }],
	}),
	span(2027, "2027-02-01", "2027-02-10", true, {
		expenses: [{ flow: "rent", amount: 600 }],
		categories: [{ category: null, amount: 600 }],
		drawn: [{ account: "cash", amount: 600 }],
	}),
]

const A_YEARS = [
	span(2026, "2026-11-15", "2026-12-31", true, {
		income: [{ flow: "pay", amount: 2000 }],
		expenses: [{ flow: "rent", amount: 600 }],
		categories: [{ category: null, amount: 600 }],
		drawn: [{ account: "cash", amount: 600 }],
		surplus: [{ account: "cash", amount: 2000 }],
	}),
	span(2027, "2027-01-01", "2027-02-10", true, {
		income: [{ flow: "pay", amount: 1000 }],
		expenses: [{ flow: "rent", amount: 1200 }],
		categories: [{ category: null, amount: 1200 }],
		drawn: [{ account: "cash", amount: 1200 }],
		surplus: [{ account: "cash", amount: 1000 }],
	}),
]

describe("case A: partial first and last spans, a mid-month horizon", () => {
	it("states one breakdown per Reporting month, cut at both ends", () => {
		expect(months(partialEnds, 1, "all")).toEqual(A_MONTHS)
	})

	it("keeps the months of one Reporting year for monthsOf", () => {
		expect(months(partialEnds, 1, "first")).toEqual(A_MONTHS.slice(0, 2))
		expect(months(partialEnds, 1, 2027)).toEqual(A_MONTHS.slice(2))
	})

	it("states one breakdown per Reporting year, cut at both ends", () => {
		expect(years(partialEnds, 1)).toEqual(A_YEARS)
	})

	it("cuts a November year start into one Reporting year over the whole run", () => {
		expect(years(partialEnds, 11)).toEqual([
			span(2026, "2026-11-15", "2027-02-10", true, {
				income: [{ flow: "pay", amount: 3000 }],
				expenses: [{ flow: "rent", amount: 1800 }],
				categories: [{ category: null, amount: 1800 }],
				drawn: [{ account: "cash", amount: 1800 }],
				surplus: [{ account: "cash", amount: 3000 }],
			}),
		])
	})

	it("leaves the Annual roll-up and every other key byte-identical", () => {
		const plain = projected(partialEnds, { cashflowBreakdown: true })
		const stated = projected(partialEnds, {
			cashflowBreakdown: true,
			reporting: { yearStart: 11, years: true, monthsOf: "all" },
		})
		expect(JSON.stringify(stated.cashflow)).toBe(JSON.stringify(plain.cashflow))
		const { cashflowYears: _years, cashflowMonths: _months, ...rest } = stated
		expect(JSON.stringify(rest)).toBe(JSON.stringify(plain))
	})
})

describe("case B: a run-out month", () => {
	const B_MONTHS = [
		span(2026, "2026-01-01", "2026-01-31", false, {
			expenses: [{ flow: "rent", amount: 400 }],
			categories: [{ category: null, amount: 400 }],
			drawn: [{ account: "cash", amount: 400 }],
		}),
		span(2026, "2026-02-01", "2026-02-28", false, {
			expenses: [{ flow: "rent", amount: 400 }],
			categories: [{ category: null, amount: 400 }],
			drawn: [{ account: "cash", amount: 400 }],
		}),
		span(2026, "2026-03-01", "2026-03-10", true, {
			income: [{ flow: "pay", amount: 100 }],
			expenses: [{ flow: "rent", amount: 400 }],
			categories: [{ category: null, amount: 400 }],
			drawn: [{ account: "cash", amount: 300 }],
			surplus: [{ account: "cash", amount: 100 }],
			unmet: 100,
		}),
	]

	it("ends its month and its year on the run-out date, both partial, with unmet there", () => {
		expect(months(runOutMonth, 1, "all")).toEqual(B_MONTHS)
		expect(years(runOutMonth, 1)).toEqual([
			span(2026, "2026-01-01", "2026-03-10", true, {
				income: [{ flow: "pay", amount: 100 }],
				expenses: [{ flow: "rent", amount: 1200 }],
				categories: [{ category: null, amount: 1200 }],
				drawn: [{ account: "cash", amount: 1100 }],
				surplus: [{ account: "cash", amount: 100 }],
				unmet: 100,
			}),
		])
	})

	it("states the identity in March: 100 + 300 + 100 = 400 + 100", () => {
		const march = months(runOutMonth, 1, "all")![2]!
		expect(identitySides(march)).toEqual({ moneyIn: 500, moneyOut: 500 })
	})

	it("accepts a month of a later Reporting year inside the horizon, and states it empty", () => {
		expect(months(runOutMonth, 1, 2027)).toEqual([])
	})

	it("refuses a month of a Reporting year after the horizon", () => {
		const result = project(runOutMonth.baseline, runOutMonth.scenario, runOutMonth.timeline, {
			reporting: { yearStart: 1, monthsOf: 2028 },
		})
		expect(result).toEqual({
			ok: false,
			problems: [{ code: "INVALID_OPTION", path: ["options", "reporting", "monthsOf"] }],
		})
	})
})

describe("case E: a horizon under a month", () => {
	const E = span(2026, "2026-03-10", "2026-03-20", true, {
		income: [{ flow: "pay", amount: 50 }],
		surplus: [{ account: "cash", amount: 50 }],
	})

	it("states one month and one year over the same days, both partial", () => {
		expect(months(underAMonth, 1, "all")).toEqual([E])
		expect(years(underAMonth, 1)).toEqual([E])
	})

	it("names a year that began in April 2025 when the year starts in April", () => {
		expect(years(underAMonth, 4)).toEqual([
			span(2025, "2026-03-10", "2026-03-20", true, {
				income: [{ flow: "pay", amount: 50 }],
				surplus: [{ account: "cash", amount: 50 }],
			}),
		])
	})

	it("states one one-day month and year when the horizon is the As-of", () => {
		const empty = span(2026, "2026-03-10", "2026-03-10", true)
		expect(months(oneDay, 1, "all")).toEqual([empty])
		expect(years(oneDay, 1)).toEqual([empty])
	})
})
