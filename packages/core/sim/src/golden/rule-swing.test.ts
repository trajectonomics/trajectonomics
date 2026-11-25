import { describe, expect, it } from "bun:test"
import { ruled } from "../engine/rule-fixture"
import { swing } from "./rule-swing"

const band = { bps: 1500, adjustBps: 800 }
const rule = {
	kind: "guardrails",
	portfolio: ["inv"],
	rateBps: 400,
	rounding: "halfUp",
	upper: band,
	lower: band,
} as const

// Hand check against the statement's own portfolios, at 4% with both bands at 15% (4.6% and 3.4%):
// 2027: Y' = 400,000 x 1.025 = 410,000, and 410,000 x 10^8 = 4.1e13 > 7,949,889 x 400 x 11,500 =
//   3.657e13, so the year is cut by 8%: 410,000 x 0.92 = 377,200.
// 2028: Y' = 377,200 x 1.025 = 386,630, and 386,630 x 10^8 = 3.8663e13 < 17,078,038 x 400 x 8,500 =
//   5.806e13, so it is raised by 8%: 386,630 x 1.08 = 417,560.4, rounded to 417,560.
describe("guardrails on a portfolio that a cost and a gift move (the rule-guardrails parity case)", () => {
	it("cuts the year after the cost, then raises after the gift", () => {
		const [statement] = ruled(swing(rule)).spendingRules!
		expect(statement!.years.map((year) => [year.date, year.action])).toEqual([
			["2026-01-01", "none"],
			["2027-01-01", "cut"],
			["2028-01-01", "raise"],
			["2029-01-01", "raise"],
			["2030-01-01", "raise"],
		])
		expect(statement!.years.slice(0, 3).map((year) => [year.portfolio, year.amount])).toEqual([
			[10_000_000, 400_000],
			[7_949_889, 377_200],
			[17_078_038, 417_560],
		])
	})
})
