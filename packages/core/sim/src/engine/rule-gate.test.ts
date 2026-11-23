import { describe, expect, it } from "bun:test"
import { oracleGrow } from "../golden/oracle-money"
import type { Milestone } from "../types"
import { project } from "./project"
import { makeFixture } from "./test-helpers"
import { ruledExpense } from "./test-rules"

const retire: Milestone = {
	id: "retire",
	combine: "all",
	criteria: [{ id: "when", kind: "date", on: "2026-04-01" }],
}
const rule = { kind: "currentRate", portfolio: ["inv"], rateBps: 400, rounding: "halfUp" } as const

/** A 5% portfolio, and a rule Flow that starts when `retire` fires and ends on 2028-12-31. */
function gated() {
	const built = makeFixture({
		accounts: [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "inv", kind: "asset", rate: 500 },
		],
		balances: { cash: 10_000_000_000, inv: 100_000_000 },
		flows: [ruledExpense("spending", rule, { startAt: "retire" })],
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2028-12-31",
		resolution: "month",
	})
	return { ...built, scenario: { ...built.scenario, milestones: [retire] } }
}

describe("a rule Flow gated by a Milestone", () => {
	it("starts its first Rule year when the gate first lets it land, 2026-04-01, and the next a year on", () => {
		const { baseline, scenario, timeline } = gated()
		const result = project(baseline, scenario, timeline, {
			spendingRules: true,
			cashflowBreakdown: true,
		})
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		const years = result.projection.spendingRules![0]!.years
		// 2026-04-01 is 90 days on and 2027-04-01 is 455: the portfolio is read at its value then.
		expect(years.map((year) => year.date)).toEqual(["2026-04-01", "2027-04-01", "2028-04-01"])
		const opening = 100_000_000n
		const read = [90, 455, 820].map((days) => Number(oracleGrow(opening, 500, days)))
		expect(years.map((year) => year.portfolio)).toEqual(read)
		expect(years.map((year) => year.amount)).toEqual(
			read.map((value) => Number((BigInt(value) * 400n + 5000n) / 10000n)),
		)
		// The breakdown plans what the rule pays: the first roll-up holds nine of the first year's twelve parts.
		const planned = result.projection.cashflow![0]!.expenses.reduce(
			(sum, line) => sum + line.amount,
			0,
		)
		expect(planned).toBe(result.projection.annual[0]!.expense)
	})
})
