import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { borrowedLoan, extraPaymentLoan, midMonthLoan } from "./statement-cases"
import { longLoan, runOutLoan, zeroRateLoan } from "./statement-edge-cases"
import {
	engineTable,
	identityHolds,
	LEVEL_PAYMENT,
	MONTH_ENDS,
	OPTION,
	onDays,
	oracleOf,
	oracleTable,
	plus,
	statementOf,
} from "./statement-helpers"

describe("edges of the statement against the oracle", () => {
	it("an extra 30,000.00 in month four moves the paid-off date earlier", () => {
		const statement = statementOf(extraPaymentLoan)
		const lands = plus(onDays(MONTH_ENDS, LEVEL_PAYMENT), onDays(["2026-04-30"], 3_000_000n))
		expect(statement.paidOff).toBe("2026-09-30")
		expect(statement.paidOff! < "2026-12-31").toBe(true)
		expect(statement.months.find((item) => item.to === "2026-04-30")?.paid).toBe(3_860_665)
		expect(identityHolds(statement)).toBe(true)
		expect(engineTable(statement)).toEqual(
			oracleTable(oracleOf(extraPaymentLoan, { planned: lands }, "2026-12-31")),
		)
	})

	// Interest for 1–15 Jan on 10,000,000 and for 16–31 Jan on 9,139,335 (after the 15th payment,
	// which the balance covers, so no accrual is posted): (15 × 10,000,000 + 16 × 9,139,335) × 600 /
	// (120,000 × 31) = 47,779. The horizon on 20 February leaves that month's accrual in closing.
	it("a payment mid-month leaves Accrued interest in the closing amount of a partial month", () => {
		const statement = statementOf(midMonthLoan)
		expect(statement.months[1]?.interest).toBe(47_779)
		expect(statement.months.at(-1)).toMatchObject({
			from: "2026-02-01",
			to: "2026-02-20",
			partial: true,
			closing: 8_358_492,
		})
		const horizon = project(
			midMonthLoan.baseline,
			midMonthLoan.scenario,
			midMonthLoan.timeline,
			OPTION,
		)
		if (!horizon.ok) throw new Error("projection failed")
		const loan = horizon.projection.rows.at(-1)!.balances.find((item) => item.account === "loan")!
		expect(loan.amount).toBe(8_358_492)
		expect(loan.accruedInterest).toBeGreaterThan(0)
		expect(loan.capitalised + loan.accruedInterest).toBe(loan.amount)
		expect(identityHolds(statement)).toBe(true)
		const lands = onDays(["2026-01-15", "2026-02-15"], LEVEL_PAYMENT)
		expect(engineTable(statement)).toEqual(
			oracleTable(oracleOf(midMonthLoan, { planned: lands }, "2026-02-20")),
		)
	})

	// The loan starts at zero and 10,000,000 is drawn on 15 March: no interest before it, and
	// 10,000,000 × 600 × 16 / (120,000 × 31) = 25,806 for the 16 days after it.
	it("a loan drawn mid-month has the borrowing in that month and nothing before it", () => {
		const statement = statementOf(borrowedLoan)
		expect(
			statement.months.slice(1, 3).map((item) => [item.drawn, item.interest, item.closing]),
		).toEqual([
			[0, 0, 0],
			[0, 0, 0],
		])
		expect(statement.months[3]).toMatchObject({
			drawn: 10_000_000,
			interest: 25_806,
			closing: 10_025_806,
		})
		expect(identityHolds(statement)).toBe(true)
		const drawn = onDays(["2026-03-15"], 10_000_000n)
		expect(engineTable(statement)).toEqual(
			oracleTable(oracleOf(borrowedLoan, { drawn }, "2026-04-30")),
		)
	})

	it("a 0% loan carries no interest and is paid off by its twelfth payment of 100,000", () => {
		const statement = statementOf(zeroRateLoan)
		expect(statement.months.every((item) => item.interest === 0)).toBe(true)
		expect(statement.months[12]).toMatchObject({ paid: 100_000, closing: 0 })
		expect(statement.paidOff).toBe("2026-12-31")
		expect(identityHolds(statement)).toBe(true)
		const lands = onDays(MONTH_ENDS, 100_000n)
		expect(engineTable(statement)).toEqual(
			oracleTable(oracleOf(zeroRateLoan, { planned: lands }, "2026-12-31")),
		)
	})

	// 100,000,000 × 600 × 31 / (120,000 × 31) = 500,000 in January; a payment of 599,551 (halfUp)
	// leaves 99,900,449. Still owed at the horizon, so there is no paid-off date.
	it("a loan still owed at the horizon has no paid-off date", () => {
		const statement = statementOf(longLoan)
		expect(statement.paidOff).toBeUndefined()
		expect(statement.months[1]).toMatchObject({
			interest: 500_000,
			paid: 599_551,
			closing: 99_900_449,
		})
		expect(identityHolds(statement)).toBe(true)
		const lands = onDays(MONTH_ENDS.slice(0, 6), 599_551n)
		expect(engineTable(statement)).toEqual(
			oracleTable(oracleOf(longLoan, { planned: lands }, "2026-06-30")),
		)
	})

	// The cash runs out on 15 February. Interest on 10,050,000 for 15 days: 10,050,000 × 600 × 15 /
	// (120,000 × 28) = 26,920 (February has 28 days).
	it("a Projection that runs out cuts the last month at the run-out date", () => {
		const statement = statementOf(runOutLoan)
		expect(statement.months.at(-1)).toMatchObject({
			from: "2026-02-01",
			to: "2026-02-15",
			interest: 26_920,
			closing: 10_076_920,
			partial: true,
		})
		expect(identityHolds(statement)).toBe(true)
		expect(engineTable(statement)).toEqual(oracleTable(oracleOf(runOutLoan, {}, "2026-02-15")))
	})
})
