import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import type { Fixture } from "../fixtures/fixture"
import type { CashflowBreakdown } from "../types"
import { identitySides, rollupMismatches } from "./cashflow-check"
import { leapShortfall, twoLevies } from "./cashflow-edge-cases"
import { levyRefundDay } from "./levy-cases"

const OPTION = { cashflowBreakdown: true } as const

function projected(fixture: Fixture) {
	const result = project(fixture.baseline, fixture.scenario, fixture.timeline, OPTION)
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.projection
}

/**
 * The refunded Settlement year, 2027 of `levyRefundDay`: a Thai Levy with a 10% Prepayment on a salary
 * of 10,000,000 a month from 31 January 2026.
 * 2026 owes: gross 120,000,000; deduction min(60,000,000, 10,000,000) = 10,000,000; net 104,000,000;
 * slices 750,000 + 2,000,000 + 3,750,000 + 5,000,000 = 11,500,000. Prepaid 12,000,000. Settlement
 * 11,500,000 − 12,000,000 = −500,000, paid on 31 March 2027.
 * 2027 to 31 March: salary 31 Jan, 28 Feb, 31 Mar = 30,000,000; Prepayment 3 × 1,000,000; the refund is
 * −500,000, so cash takes 30,000,000 − 3,000,000 + 500,000 = 27,500,000.
 * Identity: 30,000,000 = 3,000,000 − 500,000 + 27,500,000.
 */
const REFUND_YEAR_2027: CashflowBreakdown = {
	index: 1,
	from: "2027-01-01",
	to: "2027-03-31",
	income: [{ flow: "salary", amount: 30_000_000 }],
	prepaid: [{ levy: "th-like", amount: 3_000_000 }],
	settlements: [{ levy: "th-like", amount: -500_000 }],
	expenses: [],
	categories: [],
	contributions: [],
	withdrawals: [],
	drawn: [],
	surplus: [{ account: "cash", amount: 27_500_000 }],
	unmet: 0,
}

/**
 * Two Levies on a salary of 10,000,000 a month from 31 January 2026.
 * 2026, plain Levy: 10% × 120,000,000 = 12,000,000 prepaid. Capped Levy: 5% of each salary while the
 * year's gross is below 55,000,000. January to May are 10,000,000 each, so 5 × 500,000 = 2,500,000; June
 * is cut at 55,000,000, so only 5,000,000 of it is eligible: 250,000. Capped total 2,750,000. Surplus is
 * 120,000,000 − 12,000,000 − 2,750,000 = 105,250,000.
 * 2027 to 31 March: plain prepaid 3 × 1,000,000 = 3,000,000; capped prepaid 3 × 500,000 = 1,500,000
 * (gross 30,000,000 is under the cap). Plain owes 9,000,000 against 12,000,000 prepaid, a refund of
 * −3,000,000. Capped owes 5,000,000 against 2,750,000, so it settles +2,250,000 on 31 March 2027.
 * Surplus is 30,000,000 − 4,500,000 − (−750,000) = 26,250,000.
 */
const TWO_LEVIES_2026: CashflowBreakdown = {
	index: 0,
	from: "2026-01-01",
	to: "2026-12-31",
	income: [{ flow: "salary", amount: 120_000_000 }],
	prepaid: [
		{ levy: "plain", amount: 12_000_000 },
		{ levy: "capped", amount: 2_750_000 },
	],
	settlements: [],
	expenses: [],
	categories: [],
	contributions: [],
	withdrawals: [],
	drawn: [],
	surplus: [{ account: "cash", amount: 105_250_000 }],
	unmet: 0,
}

const TWO_LEVIES_2027: CashflowBreakdown = {
	index: 1,
	from: "2027-01-01",
	to: "2027-03-31",
	income: [{ flow: "salary", amount: 30_000_000 }],
	prepaid: [
		{ levy: "plain", amount: 3_000_000 },
		{ levy: "capped", amount: 1_500_000 },
	],
	settlements: [
		{ levy: "plain", amount: -3_000_000 },
		{ levy: "capped", amount: 2_250_000 },
	],
	expenses: [],
	categories: [],
	contributions: [],
	withdrawals: [],
	drawn: [],
	surplus: [{ account: "cash", amount: 26_250_000 }],
	unmet: 0,
}

/**
 * The leap-day Shortfall of `leapShortfall`, a year that stops on 29 February 2028.
 * Bonus 400 and pay 100 are income 500. Rent 300 lands on 31 January and 29 February, so expenses are
 * 600. Surplus puts 100 into cash on 31 January. On 29 February the net is 100 + 0 − 300 = −200;
 * `withdraw` draws the 100 that cash holds, and 100 is unmet.
 * Identity: 500 + 0 + 100 + 100 = 700 = 0 + 0 + 600 + 100.
 */
const LEAP_SHORTFALL_2028: CashflowBreakdown = {
	index: 0,
	from: "2028-01-01",
	to: "2028-02-29",
	income: [
		{ flow: "bonus", amount: 400 },
		{ flow: "pay", amount: 100 },
	],
	prepaid: [],
	settlements: [],
	expenses: [{ flow: "rent", amount: 600 }],
	categories: [{ category: null, amount: 600 }],
	contributions: [],
	withdrawals: [],
	drawn: [{ account: "cash", amount: 100 }],
	surplus: [{ account: "cash", amount: 100 }],
	unmet: 100,
}

function expectYear(fixture: Fixture, index: number, expected: CashflowBreakdown): void {
	const projection = projected(fixture)
	const line = projection.cashflow![index]!
	expect(line).toEqual(expected)
	expect(identitySides(line).moneyIn).toBe(identitySides(line).moneyOut)
	expect(rollupMismatches(projection.annual[index]!, line)).toEqual([])
}

describe("hand-worked years with exact lines", () => {
	it("a refunded Settlement inside the horizon: every line of 2027, the settlement negative", () => {
		expectYear(levyRefundDay, 1, REFUND_YEAR_2027)
	})

	it("two Levies with a capped Prepayment: each Levy's prepaid and settlements line, exactly", () => {
		expectYear(twoLevies, 0, TWO_LEVIES_2026)
		expectYear(twoLevies, 1, TWO_LEVIES_2027)
	})

	it("a leap-day year cut short by a Shortfall: exact drawn and unmet, run stops on 29 February", () => {
		expectYear(leapShortfall, 0, LEAP_SHORTFALL_2028)
		expect(projected(leapShortfall).annual).toHaveLength(1)
	})
})
