import { describe, expect, it } from "bun:test"
import { compoundedLoan, effectiveLoan } from "./statement-compounding-cases"
import { engineTable, identityHolds, oracleOf, oracleTable, statementOf } from "./statement-helpers"

const NO_LANDS = {}

describe("a liability at an effective annual rate", () => {
	const statement = statementOf(effectiveLoan)

	// 10,000,000 × (1.06^(31/365) − 1) = 49,611.4, so 49,611 to the minor unit. The rate is the
	// whole year's: no compounding date falls in January, so nothing is capitalised before it.
	it("grows 31 days at 6% effective to 49,611 of interest", () => {
		expect(statement.months[1]).toEqual({
			from: "2026-01-01",
			to: "2026-01-31",
			opening: 10_000_000,
			drawn: 0,
			paid: 0,
			interest: 49_611,
			closing: 10_049_611,
			partial: false,
		})
		expect(identityHolds(statement)).toBe(true)
	})
})

// January's interest is the 31 days over the whole compounding period's counted days: 90 for a
// quarter, 181 for a half-year and 365 for a year. 10,000,000 × 600 × 31 / (10,000 × periods × days).
const CASES: readonly (readonly ["quarterly" | "semiannual" | "annual", number])[] = [
	["quarterly", 51_667],
	["semiannual", 51_381],
	["annual", 50_959],
]

for (const [period, january] of CASES) {
	describe(`a nominal liability compounded ${period}`, () => {
		const fixture = compoundedLoan(period)
		const statement = statementOf(fixture)

		it(`accrues ${january} of interest in January, before its first compounding date`, () => {
			expect(statement.months[1]).toMatchObject({
				opening: 10_000_000,
				interest: january,
				closing: 10_000_000 + january,
			})
		})

		it("matches the oracle in every month of 2026", () => {
			expect(engineTable(statement)).toEqual(oracleTable(oracleOf(fixture, NO_LANDS, "2026-12-31")))
			expect(identityHolds(statement)).toBe(true)
		})
	})
}
