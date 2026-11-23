import { describe, expect, test } from "bun:test"
import type { ProjectionRun } from "../../contract"
import { projectionRunFixture } from "../projection/fixtures.test-support"
import { statementOf } from "./loan-statement"

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

	test("the payment is the first month's paid that is not zero, as the CLI reports it", () => {
		expect(statementOf(runWith("2028-01-31", rows), "loan").payment).toBe("12999.10")
	})

	test("the paid-off date is the CLI's, and a loan paid off owes nothing", () => {
		const statement = statementOf(runWith("2028-01-31", rows), "loan")
		expect(statement.paidOff).toBe("2028-01-31")
		expect(statement.owing).toBeNull()
	})

	test("a loan not paid off by the end states what it owes at the last month's end", () => {
		const statement = statementOf(runWith(null, rows.slice(0, 3)), "loan")
		expect(statement.paidOff).toBeNull()
		expect(statement.owing).toEqual({ amount: "289830.40", date: "2027-02-28" })
	})

	test("the schedule is grouped by year, and each month keeps the CLI's rows", () => {
		const statement = statementOf(runWith("2028-01-31", rows), "loan")
		expect(statement.years.map((year) => year.year)).toEqual(["2026", "2027", "2028"])
		expect(statement.years[1]?.rows.map((row) => row.month)).toEqual(["2027-01", "2027-02"])
		expect(statement.years[1]?.rows[1]).toEqual({
			month: "2027-02",
			opening: "301562.50",
			drawn: "0.00",
			interest: "1567.00",
			paid: "12999.10",
			closing: "289830.40",
		})
	})

	test("only the rows of the loan's own Account are shown", () => {
		const statement = statementOf(runWith("2028-01-31", rows), "loan")
		expect(statement.years.flatMap((year) => year.rows.map((row) => row.month))).not.toContain(
			"2026-11",
		)
	})

	test("a Projection without the statements gives an empty statement", () => {
		const statement = statementOf(undefined, "loan")
		expect(statement).toEqual({ payment: null, paidOff: null, owing: null, years: [] })
	})
})
