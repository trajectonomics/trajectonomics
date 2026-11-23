import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { employerShare } from "../engine/test-employer"
import type { CashflowBreakdown } from "../types"
import { identitySides, rollupMismatches } from "./cashflow-check"
import { employerYear } from "./employer-cases"
import { oracleAccountWalk } from "./oracle-account-walk"
import { oracleCashflow } from "./oracle-cashflow"

/**
 * Twelve months from 31 Jan 2026. Income 12 × 5,000,000.00 = 60,000,000.00; living 12 × 4,000,000.00 =
 * 48,000,000.00. Available cashflow is 1,000,000.00 a month; the member's 200,000.00 lands in full
 * (2,400,000.00), 800,000.00 a month goes to cash (9,600,000.00). The employer's 5% of 5,000,000.00 is
 * 250,000.00 a month, 3,000,000.00 in the year, and never enters cashflow.
 * Identity: 60,000,000 = 48,000,000 + 2,400,000 + 9,600,000, with the employer's money left out of both sides.
 */
const HAND_YEAR: CashflowBreakdown = {
	index: 0,
	from: "2026-01-01",
	to: "2026-12-31",
	income: [{ flow: "salary", amount: 60_000_000 * 100 }],
	prepaid: [],
	settlements: [],
	expenses: [{ flow: "living", amount: 48_000_000 * 100 }],
	categories: [{ category: null, amount: 48_000_000 * 100 }],
	contributions: [{ flow: "pvd-member", account: "pvd", applied: 2_400_000 * 100, unfunded: 0 }],
	employer: [{ flow: "pvd-employer", account: "pvd", amount: 3_000_000 * 100 }],
	withdrawals: [],
	drawn: [],
	surplus: [{ account: "cash", amount: 9_600_000 * 100 }],
	unmet: 0,
}

const ENDS = { frequency: "monthly", start: "2026-01-31" } as const
const { baseline, scenario, timeline } = employerYear
const result = project(baseline, scenario, timeline, { cashflowBreakdown: true })
if (!result.ok) throw new Error(JSON.stringify(result.problems))
const { projection } = result
const line = projection.cashflow![0]!

describe("the employer's year", () => {
	it("gives every breakdown line the hand calculation, the employer's money in its own list", () => {
		expect(line).toEqual(HAND_YEAR)
	})

	it("keeps money in equal to money out, and every total equal to its roll-up field", () => {
		expect(identitySides(line)).toEqual({ moneyIn: 6_000_000_000, moneyOut: 6_000_000_000 })
		expect(rollupMismatches(projection.annual[0]!, line)).toEqual([])
		expect(projection.annual[0]?.employerContributions).toBe(300_000_000)
	})

	it("leaves growth at 0 and closes with cash 9,600,000.00 and pvd 5,400,000.00", () => {
		const closing = projection.rows.find((row) => row.date === "2026-12-31")!
		expect(closing.balances.map((item) => item.amount)).toEqual([960_000_000, 540_000_000])
		expect(projection.annual[0]).toMatchObject({ income: 6_000_000_000, interest: 0 })
	})

	it("agrees with the independent day-by-day oracle on every line", () => {
		// The oracle prices stated amounts only, so the employer's 5% of 5,000,000.00 is stated as 250,000.00.
		const flows = employerYear.scenario.flows.map((flow) =>
			flow.id === "pvd-employer" ? employerShare("pvd-employer", "pvd", 25_000_000, ENDS) : flow,
		)
		const oracle = oracleCashflow({
			...employerYear,
			scenario: { ...employerYear.scenario, flows },
		})
		expect(oracle.employer.get("pvd-employer")).toBe(300_000_000n)
		expect(oracle.applied.get("pvd-member")).toBe(240_000_000n)
		expect(oracle.applied.has("pvd-employer")).toBe(false)
		expect(oracle.surplus.get("cash")).toBe(960_000_000n)
		expect(oracle.unmet).toBe(0n)
	})

	it("agrees with the independent walk, which prices the derived share itself, on accessible net worth", () => {
		const walk = oracleAccountWalk(employerYear, scenario.flows, timeline.horizon)
		const rows = new Map(projection.rows.map((row) => [row.date, row.accessibleNetWorth]))
		const compared = [...walk.after].filter(([date]) => rows.has(date))
		expect(compared.length).toBe(12)
		for (const [date, accessible] of compared) expect(BigInt(rows.get(date)!)).toBe(accessible)
		// 12 × (800,000.00 + 200,000.00 + 250,000.00) = 15,000,000.00 by the last month end.
		expect(walk.after.get("2026-12-31")).toBe(1_500_000_000n)
	})
})
