import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import type { Fixture } from "../fixtures/fixture"
import type {
	CashflowBreakdown,
	CashflowLines,
	Projection,
	ProjectionOptions,
	ReportingCashflow,
} from "../types"
import { leapDay, levyApril } from "./reporting-cases"
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
): readonly ReportingCashflow[] {
	return projected(fixture, { reporting: { yearStart, monthsOf } }).cashflowMonths ?? []
}

function years(fixture: Fixture, yearStart: number): readonly ReportingCashflow[] {
	return projected(fixture, { reporting: { yearStart, years: true } }).cashflowYears ?? []
}

function at(fixture: Fixture, yearStart: number, from: string): ReportingCashflow | undefined {
	return months(fixture, yearStart, "all").find((month) => month.from === from)
}

/**
 * Case C, hand-worked: salary 10,000 on each month end, 10% prepaid to `plain`; the 2025 period owes
 * 9000 against 7000 carried in, so 31 March 2026 pays 2000, and the 2026 period owes 9000 against
 * 12,000 prepaid, so 31 March 2027 refunds 3000. A plain salary day nets 9000.
 */
describe("case C: a Levy settlement month, and a year start of April", () => {
	it("records a settlement as a payment in March 2026 and a refund in March 2027", () => {
		expect(at(levyApril, 1, "2026-03-01")).toEqual(
			span(2026, "2026-03-01", "2026-03-31", false, {
				income: [{ flow: "salary", amount: 10_000 }],
				prepaid: [{ levy: "plain", amount: 1000 }],
				settlements: [{ levy: "plain", amount: 2000 }],
				surplus: [{ account: "cash", amount: 7000 }],
			}),
		)
		expect(at(levyApril, 1, "2027-03-01")).toEqual(
			span(2027, "2027-03-01", "2027-03-31", false, {
				income: [{ flow: "salary", amount: 10_000 }],
				prepaid: [{ levy: "plain", amount: 1000 }],
				settlements: [{ levy: "plain", amount: -3000 }],
				surplus: [{ account: "cash", amount: 12_000 }],
			}),
		)
		expect(at(levyApril, 1, "2027-04-01")).toEqual(
			span(2027, "2027-04-01", "2027-04-30", false, {
				income: [{ flow: "salary", amount: 10_000 }],
				prepaid: [{ levy: "plain", amount: 1000 }],
				surplus: [{ account: "cash", amount: 9000 }],
			}),
		)
	})

	it("states the year 2026 whole and 2027 up to the horizon", () => {
		expect(years(levyApril, 1)).toEqual([
			span(2026, "2026-01-01", "2026-12-31", false, {
				income: [{ flow: "salary", amount: 120_000 }],
				prepaid: [{ levy: "plain", amount: 12_000 }],
				settlements: [{ levy: "plain", amount: 2000 }],
				surplus: [{ account: "cash", amount: 106_000 }],
			}),
			span(2027, "2027-01-01", "2027-04-30", true, {
				income: [{ flow: "salary", amount: 40_000 }],
				prepaid: [{ levy: "plain", amount: 4000 }],
				settlements: [{ levy: "plain", amount: -3000 }],
				surplus: [{ account: "cash", amount: 39_000 }],
			}),
		])
	})

	it("cuts a year start of April into 2025, 2026 and 2027", () => {
		expect(years(levyApril, 4)).toEqual([
			span(2025, "2026-01-01", "2026-03-31", true, {
				income: [{ flow: "salary", amount: 30_000 }],
				prepaid: [{ levy: "plain", amount: 3000 }],
				settlements: [{ levy: "plain", amount: 2000 }],
				surplus: [{ account: "cash", amount: 25_000 }],
			}),
			span(2026, "2026-04-01", "2027-03-31", false, {
				income: [{ flow: "salary", amount: 120_000 }],
				prepaid: [{ levy: "plain", amount: 12_000 }],
				settlements: [{ levy: "plain", amount: -3000 }],
				surplus: [{ account: "cash", amount: 111_000 }],
			}),
			span(2027, "2027-04-01", "2027-04-30", true, {
				income: [{ flow: "salary", amount: 10_000 }],
				prepaid: [{ levy: "plain", amount: 1000 }],
				surplus: [{ account: "cash", amount: 9000 }],
			}),
		])
	})

	it("keeps the three months of Reporting year 2025 for monthsOf first", () => {
		expect(months(levyApril, 4, "first")).toEqual([
			span(2025, "2026-01-01", "2026-01-31", false, {
				income: [{ flow: "salary", amount: 10_000 }],
				prepaid: [{ levy: "plain", amount: 1000 }],
				surplus: [{ account: "cash", amount: 9000 }],
			}),
			span(2025, "2026-02-01", "2026-02-28", false, {
				income: [{ flow: "salary", amount: 10_000 }],
				prepaid: [{ levy: "plain", amount: 1000 }],
				surplus: [{ account: "cash", amount: 9000 }],
			}),
			span(2025, "2026-03-01", "2026-03-31", false, {
				income: [{ flow: "salary", amount: 10_000 }],
				prepaid: [{ levy: "plain", amount: 1000 }],
				settlements: [{ levy: "plain", amount: 2000 }],
				surplus: [{ account: "cash", amount: 7000 }],
			}),
		])
	})

	it("covers the Annual roll-ups with yearStart 1 and an As-of on 1 January", () => {
		const stated = projected(levyApril, {
			cashflowBreakdown: true,
			reporting: { yearStart: 1, years: true },
		})
		const lineOf = (line: ReportingCashflow): CashflowLines => {
			const { year: _year, partial: _partial, ...rest } = line
			return rest
		}
		const annualLine = (line: CashflowBreakdown): CashflowLines => {
			const { index: _index, ...rest } = line
			return rest
		}
		expect(stated.cashflowYears!.map(lineOf)).toEqual(stated.cashflow!.map(annualLine))
	})
})

/**
 * Case D, hand-worked: 100 lands on 29 February 2028 and 30 is drawn on 29 February, 29 March; the
 * 29 April rent is past the 15 April horizon. The leap day is the As-of, so its month is its own day.
 */
describe("case D: the leap day", () => {
	it("states a one-day February month, a whole March and a cut April", () => {
		expect(months(leapDay, 1, "all")).toEqual([
			span(2028, "2028-02-29", "2028-02-29", true, {
				income: [{ flow: "pay", amount: 100 }],
				expenses: [{ flow: "rent", amount: 30 }],
				categories: [{ category: null, amount: 30 }],
				surplus: [{ account: "cash", amount: 70 }],
			}),
			span(2028, "2028-03-01", "2028-03-31", false, {
				expenses: [{ flow: "rent", amount: 30 }],
				categories: [{ category: null, amount: 30 }],
				drawn: [{ account: "cash", amount: 30 }],
			}),
			span(2028, "2028-04-01", "2028-04-15", true),
		])
	})

	it("states the year 2028 whole from the leap day, and 2027 ending on 29 February", () => {
		expect(years(leapDay, 1)).toEqual([
			span(2028, "2028-02-29", "2028-04-15", true, {
				income: [{ flow: "pay", amount: 100 }],
				expenses: [{ flow: "rent", amount: 60 }],
				categories: [{ category: null, amount: 60 }],
				drawn: [{ account: "cash", amount: 30 }],
				surplus: [{ account: "cash", amount: 70 }],
			}),
		])
		expect(years(leapDay, 3)).toEqual([
			span(2027, "2028-02-29", "2028-02-29", true, {
				income: [{ flow: "pay", amount: 100 }],
				expenses: [{ flow: "rent", amount: 30 }],
				categories: [{ category: null, amount: 30 }],
				surplus: [{ account: "cash", amount: 70 }],
			}),
			span(2028, "2028-03-01", "2028-04-15", true, {
				expenses: [{ flow: "rent", amount: 30 }],
				categories: [{ category: null, amount: 30 }],
				drawn: [{ account: "cash", amount: 30 }],
			}),
		])
	})

	it("gives the February month of year 2027 for monthsOf first with a March year start", () => {
		expect(months(leapDay, 3, "first")).toEqual([
			span(2027, "2028-02-29", "2028-02-29", true, {
				income: [{ flow: "pay", amount: 100 }],
				expenses: [{ flow: "rent", amount: 30 }],
				categories: [{ category: null, amount: 30 }],
				surplus: [{ account: "cash", amount: 70 }],
			}),
		])
	})
})
