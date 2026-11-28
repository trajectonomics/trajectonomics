import { describe, expect, it } from "bun:test"
import type { CashflowBreakdown, CashflowLines, ReportingCashflow } from "../types"
import { levyApril } from "./reporting-cases"
import { span } from "./reporting-check"
import { at, months, projected, years } from "./reporting-projected"

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
