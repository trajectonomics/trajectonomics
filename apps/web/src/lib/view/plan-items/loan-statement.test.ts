import { describe, expect, test } from "bun:test"
import type { ProjectionRun } from "../../contract"
import { projectionRunFixture } from "../projection/fixtures.test-support"
import { type LoanTerms, statementOf } from "./loan-statement"

type Liability = Extract<ProjectionRun["tables"][number], { name: "liabilities" }>["rows"][number]

/** One liability's month, with the CLI's money as text. */
function month(from: string, to: string, fields: Partial<Liability> = {}): Liability {
	return {
		account: "loan",
		from,
		to,
		opening: "0.00",
		drawn: "0.00",
		paid: "0.00",
		interest: "0.00",
		closing: "0.00",
		partial: false,
		...fields,
	}
}

/** The terms the loan below is read with: its first payment falls in February 2027, with no extra payment. */
const TERMS: LoanTerms = { firstPayment: "2027-02-01", extras: [] }

/** A Projection run with the loans' tables: the months of `loan` and of another liability, and its paid-off date. */
function runWith(paidOff: string | null, rows: Liability[]): ProjectionRun {
	return projectionRunFixture({
		tables: [
			{
				name: "liabilities",
				count: rows.length,
				rows: [...rows, month("2026-11-01", "2026-11-30", { account: "car" })],
			},
			{
				name: "paidOff",
				count: 2,
				rows: [
					{ account: "car", date: "2027-12-01" },
					{ account: "loan", date: paidOff },
				],
			},
		],
	})
}

describe("the statement of a loan, as the CLI prints it", () => {
	const rows = [
		month("2026-12-01", "2026-12-31", { opening: "0.00", paid: "0.00", closing: "0.00" }),
		month("2027-01-01", "2027-01-31", {
			opening: "0.00",
			drawn: "300000.00",
			interest: "1562.50",
			closing: "301562.50",
		}),
		month("2027-02-01", "2027-02-28", {
			opening: "301562.50",
			paid: "12999.10",
			interest: "1567.00",
			closing: "289830.40",
		}),
		month("2028-01-01", "2028-01-31", { opening: "10.00", paid: "10.00", closing: "0.00" }),
	]

	test("the payment is the paid of the month the first payment falls in, as the CLI reports it", () => {
		expect(statementOf(runWith("2028-01-31", rows), "loan", TERMS).payment).toEqual({
			amount: "12999.10",
			month: "2027-02",
			withExtra: false,
		})
	})

	test("an extra payment in the first payment month is said to be in that figure", () => {
		const once = { start: "2027-02-15", frequency: "once" }
		const monthly = { start: "2027-01-01", end: "2027-06-01", frequency: "monthly" }
		const later = { start: "2027-03-01", frequency: "once" }
		const payment = (extras: LoanTerms["extras"]) =>
			statementOf(runWith("2028-01-31", rows), "loan", { ...TERMS, extras }).payment?.withExtra
		expect(payment([once])).toBe(true)
		expect(payment([monthly])).toBe(true)
		expect(payment([later])).toBe(false)
	})

	test("an extra payment of a frequency the form does not write is not said to be in that figure", () => {
		const yearly = { start: "2027-02-01", frequency: "yearly" }
		const weekly = { start: "2027-01-01", end: "2027-06-01", frequency: "weekly" }
		const payment = (extras: LoanTerms["extras"]) =>
			statementOf(runWith("2028-01-31", rows), "loan", { ...TERMS, extras }).payment?.withExtra
		expect(payment([yearly])).toBe(false)
		expect(payment([weekly])).toBe(false)
	})

	test("the schedule leaves out the empty months before the loan and after it is paid off", () => {
		const padded = [
			month("2026-10-01", "2026-10-31"),
			...rows,
			month("2028-02-01", "2028-02-29"),
			month("2028-03-01", "2028-03-31"),
		]
		const months = statementOf(runWith("2028-01-31", padded), "loan", TERMS).years.flatMap((year) =>
			year.rows.map((row) => row.month),
		)
		expect(months).toEqual(["2027-01", "2027-02", "2028-01"])
	})

	test("the paid-off date is the CLI's, and a loan paid off owes nothing", () => {
		const statement = statementOf(runWith("2028-01-31", rows), "loan", TERMS)
		expect(statement.paidOff).toBe("2028-01-31")
		expect(statement.owing).toBeNull()
	})

	test("a loan not paid off by the end states what it owes at the last month's end", () => {
		const statement = statementOf(runWith(null, rows.slice(0, 3)), "loan", TERMS)
		expect(statement.paidOff).toBeNull()
		expect(statement.owing).toEqual({ amount: "289830.40", date: "2027-02-28" })
	})

	test("the schedule is grouped by year, and each month keeps the CLI's rows", () => {
		const statement = statementOf(runWith("2028-01-31", rows), "loan", TERMS)
		expect(statement.years.map((year) => year.year)).toEqual(["2027", "2028"])
		expect(statement.years[0]?.rows.map((row) => row.month)).toEqual(["2027-01", "2027-02"])
		expect(statement.years[0]?.rows[1]).toEqual({
			month: "2027-02",
			opening: "301562.50",
			drawn: "0.00",
			interest: "1567.00",
			paid: "12999.10",
			closing: "289830.40",
		})
	})

	test("only the rows of the loan's own Account are shown", () => {
		const statement = statementOf(runWith("2028-01-31", rows), "loan", TERMS)
		expect(statement.years.flatMap((year) => year.rows.map((row) => row.month))).not.toContain(
			"2026-11",
		)
	})

	test("a Projection without the statements gives an empty statement", () => {
		const statement = statementOf(undefined, "loan", TERMS)
		expect(statement).toEqual({ payment: null, paidOff: null, owing: null, years: [] })
	})
})
