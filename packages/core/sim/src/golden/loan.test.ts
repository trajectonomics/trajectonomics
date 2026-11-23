import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { income } from "../engine/test-flows"
import type { Account, Flow, Rounding, Scenario, Timeline } from "../types"
import { type LoanSchedule, walkLoan } from "./oracle-loan"

const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31, 31]
const accounts: readonly Account[] = [
	{ id: "cash", kind: "asset", rate: 0 },
	{ id: "loan", kind: "liability", rate: 600, compounding: "monthly" },
]

/** A 100,000.00 loan at 6% nominal monthly, repaid by a level Contribution on `start` each month. */
function loanRun(
	start: string,
	rounding: Rounding,
	end: string | undefined,
	horizon: string,
): { readonly balances: readonly number[] } {
	const repay: Flow = {
		id: "repay",
		kind: "contribution",
		target: "loan",
		frequency: "monthly",
		start,
		...(end === undefined ? {} : { end }),
		level: { principal: 10_000_000, payments: 12, rounding },
	}
	const scenario: Scenario = {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts: [...accounts],
		flows: [income("pay", 1_000_000, { frequency: "monthly", start: "2026-01-01" }), repay],
		cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: ["cash"] },
	}
	const timeline: Timeline = { start: "2025-12-31", horizon, resolution: "month" }
	const result = project(
		{
			schemaVersion: 1,
			balances: [
				{ account: "cash", amount: 0 },
				{ account: "loan", amount: 10_000_000 },
			],
		},
		scenario,
		timeline,
	)
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	const balances = result.projection.rows.map(
		(row) => row.balances.find((item) => item.account === "loan")?.amount ?? 0,
	)
	return { balances }
}

function monthEndPaid(lastMonth: number, day: (month: number) => number) {
	return (month: number, dayOfMonth: number) => month <= lastMonth && dayOfMonth === day(month)
}

describe("a level loan against the independent oracle", () => {
	// Payments on every month end. Rounding up clears the loan with the 12th payment, which is
	// capped at the amount owed (the oracle's 12th value is 0).
	it("ceil clears the loan with the 12th month-end payment", () => {
		const schedule: LoanSchedule = {
			opening: 10_000_000n,
			annualBps: 600n,
			principal: 10_000_000n,
			payments: 12,
			rounding: "ceil",
			monthDays: DAYS.slice(0, 12),
			paidOn: monthEndPaid(11, (month) => DAYS[month]!),
		}
		const oracle = walkLoan(schedule).map(Number)
		const { balances } = loanRun("2026-01-31", "ceil", "2026-12-31", "2026-12-31")
		expect(balances).toEqual([10_000_000, ...oracle])
		expect(balances.at(-1)).toBe(0)
	})

	// Rounding half up leaves 5 satang after the 12th payment; the 13th date pays them, since the
	// Flow has no end.
	it("halfUp leaves a few satang that the 13th month-end payment clears", () => {
		const schedule: LoanSchedule = {
			opening: 10_000_000n,
			annualBps: 600n,
			principal: 10_000_000n,
			payments: 12,
			rounding: "halfUp",
			monthDays: DAYS,
			paidOn: monthEndPaid(12, (month) => DAYS[month]!),
		}
		const oracle = walkLoan(schedule).map(Number)
		const { balances } = loanRun("2026-01-31", "halfUp", undefined, "2027-01-31")
		expect(balances).toEqual([10_000_000, ...oracle])
		expect(oracle[11]).toBe(5)
		expect(balances.at(-1)).toBe(0)
	})

	// Payments on the 15th of each month: the balance accrues to the 15th, so a residual is left
	// at month end, as the oracle computes it, and the engine reports it.
	it("a payment on the 15th leaves the residual the oracle computes", () => {
		const schedule: LoanSchedule = {
			opening: 10_000_000n,
			annualBps: 600n,
			principal: 10_000_000n,
			payments: 12,
			rounding: "halfUp",
			monthDays: DAYS,
			paidOn: monthEndPaid(11, () => 15),
		}
		const oracle = walkLoan(schedule).map(Number)
		const { balances } = loanRun("2026-01-15", "halfUp", undefined, "2026-12-31")
		expect(balances).toEqual([10_000_000, ...oracle.slice(0, 12)])
	})
})
