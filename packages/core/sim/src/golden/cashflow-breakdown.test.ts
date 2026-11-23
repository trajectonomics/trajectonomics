import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { contribution, income } from "../engine/test-flows"
import type { Fixture } from "../fixtures/fixture"
import type { CashflowBreakdown } from "../types"
import { handCase } from "./cashflow-cases"
import { identitySides, rollupMismatches } from "./cashflow-check"
import { levyRefundDay, levyShortfallDay } from "./levy-cases"
import { oracleCashflow } from "./oracle-cashflow"

const OPTION = { cashflowBreakdown: true } as const

function projected(fixture: typeof handCase) {
	const result = project(fixture.baseline, fixture.scenario, fixture.timeline, OPTION)
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.projection
}

/**
 * The hand-worked year of 2026. Salary 12 × 1,000,000 and passive 300,000 on 15 June. Prepayment is
 * 5% of each salary: 12 × 50,000. Living 12 × 200,000 (essentials), school 4 × 150,000 at quarter ends
 * (uncategorised), car 1,200,000 on 20 May (car). Loan payments 12 × 100,000 never exceed the amount
 * owed. Savings contributions ask 1,000,000 each month end; Available cashflow is 650,000, or 500,000 in
 * a school month, so 8 × 650,000 + 4 × 500,000 = 7,200,000 lands and 4,800,000 is unfunded. The car
 * draws 1,200,000 from savings on 20 May. Passive income fills cash to its 100,000 cap, then savings
 * takes 200,000; the 500,000 borrowed on 10 July fills savings, since cash is at its cap.
 * Identity: 12,300,000 + 500,000 + 1,200,000 = 14,000,000 = 600,000 + 4,200,000 + 8,400,000 + 800,000.
 */
const HAND_YEAR: CashflowBreakdown = {
	index: 0,
	from: "2026-01-01",
	to: "2026-12-31",
	income: [
		{ flow: "salary", amount: 12_000_000 },
		{ flow: "passive", amount: 300_000 },
	],
	prepaid: [{ levy: "th-like", amount: 600_000 }],
	settlements: [],
	expenses: [
		{ flow: "living", category: "essentials", amount: 2_400_000 },
		{ flow: "school", amount: 600_000 },
		{ flow: "car", category: "car", amount: 1_200_000 },
	],
	categories: [
		{ category: "essentials", amount: 2_400_000 },
		{ category: "car", amount: 1_200_000 },
		{ category: null, amount: 600_000 },
	],
	contributions: [
		{ flow: "loan-payment", account: "loan", applied: 1_200_000, unfunded: 0 },
		{ flow: "ssf", account: "savings", applied: 7_200_000, unfunded: 4_800_000 },
	],
	withdrawals: [{ flow: "borrow", account: "loan", amount: 500_000 }],
	drawn: [{ account: "savings", amount: 1_200_000 }],
	surplus: [
		{ account: "cash", amount: 100_000 },
		{ account: "savings", amount: 700_000 },
	],
	unmet: 0,
}

/** Each line's (name, amount) pairs, zero amounts left out, sorted for a set comparison. */
function pairs(entries: readonly (readonly [string, bigint | number])[]): string[] {
	return entries
		.filter(([, amount]) => Number(amount) !== 0)
		.map(([name, amount]) => `${name}=${amount}`)
		.sort()
}

describe("the hand-worked year of the breakdown", () => {
	const line = projected(handCase).cashflow![0]!

	it("gives every line the hand calculation, in Scenario order", () => {
		expect(line).toEqual(HAND_YEAR)
	})

	it("satisfies the identity exactly, and every total equals its roll-up field", () => {
		expect(identitySides(line)).toEqual({ moneyIn: 14_000_000, moneyOut: 14_000_000 })
		expect(rollupMismatches(projected(handCase).annual[0]!, line)).toEqual([])
	})

	it("agrees with the independent day-by-day oracle, line by line", () => {
		const oracle = oracleCashflow(handCase)
		const engine = [...line.income, ...line.expenses, ...line.withdrawals]
		expect(pairs(engine.map((item) => [item.flow, item.amount]))).toEqual(
			pairs([...oracle.planned]),
		)
		expect(pairs(line.contributions.map((item) => [item.flow, item.applied]))).toEqual(
			pairs([...oracle.applied]),
		)
		expect(pairs(line.contributions.map((item) => [item.flow, item.unfunded]))).toEqual(
			pairs([...oracle.unfunded]),
		)
		expect(pairs(line.prepaid.map((item) => [item.levy, item.amount]))).toEqual(
			pairs([...oracle.prepaid]),
		)
		expect(pairs(line.drawn.map((item) => [item.account, item.amount]))).toEqual(
			pairs([...oracle.drawn]),
		)
		expect(pairs(line.surplus.map((item) => [item.account, item.amount]))).toEqual(
			pairs([...oracle.surplus]),
		)
		expect(line.unmet).toBe(Number(oracle.unmet))
	})
})

describe("the breakdown's edges", () => {
	it("records a refunded Settlement as a negative line in the period it settles", () => {
		const projection = projected(levyRefundDay)
		const levy = projection.levies![0]!
		const period = levy.periods.find((item) => item.settled && item.settlement < 0)!
		expect(period.settlementDate).toBe("2027-03-31")
		expect(projection.cashflow![1]!.settlements).toEqual([
			{ levy: levy.id, amount: period.settlement },
		])
		expect(rollupMismatches(projection.annual[1]!, projection.cashflow![1]!)).toEqual([])
	})

	it("keeps the identity through a Shortfall that ends the run, with unmet on the run-out date", () => {
		const projection = projected(levyShortfallDay)
		const last = projection.cashflow!.at(-1)!
		expect(last.unmet).toBeGreaterThan(0)
		expect(identitySides(last).moneyIn).toBe(identitySides(last).moneyOut)
		expect(rollupMismatches(projection.annual.at(-1)!, last)).toEqual([])
	})

	// Two contributions to one Account on one date, 160 against 100 of Available cashflow. The Account's
	// 100 is split in Scenario order, so "zeta", declared first, takes 80; id order would favour "alpha".
	const sameDate: Fixture = {
		baseline: {
			schemaVersion: 1,
			balances: [
				{ account: "cash", amount: 0 },
				{ account: "savings", amount: 0 },
			],
		},
		scenario: {
			schemaVersion: 4,
			currency: "THB",
			economy: { inflation: 0 },
			accounts: [
				{ id: "cash", kind: "asset", rate: 0 },
				{ id: "savings", kind: "asset", rate: 0 },
			],
			flows: [
				contribution("zeta", "savings", 80, { start: "2026-01-01" }),
				contribution("alpha", "savings", 80, { start: "2026-01-01" }),
				income("pay", 100, { start: "2026-01-01" }),
			],
			cashflow: { surplus: [{ account: "cash" }], contribute: ["savings"], withdraw: [] },
		},
		timeline: { start: "2026-01-01", horizon: "2026-12-31", resolution: "month" },
	}

	it("splits a capped Account's amount over its Flows in Scenario order, first come first served", () => {
		const line = projected(sameDate).cashflow![0]!
		expect(line.contributions).toEqual([
			{ flow: "zeta", account: "savings", applied: 80, unfunded: 0 },
			{ flow: "alpha", account: "savings", applied: 20, unfunded: 60 },
		])
		expect(rollupMismatches(projected(sameDate).annual[0]!, line)).toEqual([])
	})
})
