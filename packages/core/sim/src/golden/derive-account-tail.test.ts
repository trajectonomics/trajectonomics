import { describe, expect, it } from "bun:test"
import { contribution, derivedExpense, expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import { financialIndependence } from "../index"
import type { Derive, Milestone, SurvivalOptions } from "../types"
import { oracleAccountFi } from "./oracle-account-fi"
import { oracleAccountWalk } from "./oracle-account-walk"

const monthly = { frequency: "monthly", start: "2026-01-01" } as const

/** `1 / den` of an Account's value, a monthly fee. */
function share(account: string, den: number): Derive {
	return {
		measures: [
			{ id: "value", op: "account", account },
			{ id: "share", op: "scale", of: "value", num: 1, den, rounding: "halfUp" },
		],
		result: "share",
	}
}

const rich: Milestone = {
	id: "rich",
	combine: "all",
	criteria: [
		{
			id: "nw",
			kind: "metric",
			metric: "netWorth",
			op: "atLeast",
			amount: 12_000_000,
			terms: "nominal",
		},
	],
}

/**
 * A fee of inv/120 and a luxury of inv/240 once 'rich', a saving that ends at 'rich', and 8,500,000
 * in inv at 3%. Stopping the salary on 2026-04-01 leaves a walk that survives the horizon of
 * 2031-01-01 and runs out in May 2031, inside the year the next-12-months window reads.
 */
const built = makeFixture({
	accounts: [
		{ id: "cash", kind: "asset", rate: 0 },
		{ id: "inv", kind: "asset", rate: 300 },
	],
	balances: { cash: 600_000, inv: 8_500_000 },
	flows: [
		income("salary", 600_000, monthly),
		expense("living", 140_000, monthly),
		contribution("save", "inv", 300_000, { ...monthly, endAt: "rich" }),
		derivedExpense("fee", share("inv", 120), monthly),
		derivedExpense("luxury", share("inv", 240), { ...monthly, startAt: "rich" }),
	],
	surplus: [{ account: "cash" }],
	contribute: ["inv"],
	withdraw: ["cash", "inv"],
	start: "2026-01-01",
	horizon: "2031-01-01",
	resolution: "month",
})
const fixture = { ...built, scenario: { ...built.scenario, milestones: [rich] } }

describe("a candidate that runs out in the year past the horizon", () => {
	const stopped = fixture.scenario.flows.map((flow) =>
		flow.kind === "income" && flow.earned ? { ...flow, end: "2026-03-31" } : flow,
	)
	const walk = oracleAccountWalk(fixture, stopped, "2032-01-01")

	it("is priced by the oracle after the Shortfall: living of 140,000 on each later date, a fee of 0", () => {
		// inv is drained by 1 May 2031 (fee 28 on top of living), so from 1 Jun 2031 each date plans
		// the living of 140,000 and a fee on an inv of 0; the walk landed nothing after the Shortfall.
		expect(walk.survived).toBe(true)
		const after = walk.expenses.filter((item) => item.date > "2031-05-01")
		expect(after.map((item) => item.date)).toEqual([
			"2031-06-01",
			"2031-07-01",
			"2031-08-01",
			"2031-09-01",
			"2031-10-01",
			"2031-11-01",
			"2031-12-01",
			"2032-01-01",
		])
		expect(after.every((item) => item.amount === 140_000n)).toBe(true)
	})

	it("is priced by the engine from the states the tail ended with, as the oracle prices it", () => {
		// The unchanged plan pays a fee on an inv still holding money in 2031; the candidate's own
		// tail has none after May, so its buffer needs 3 months of the smaller expense and 2026-04-01
		// passes. Reading the horizon's states instead priced the fee dear and moved FI to 2026-05-01.
		const reference = {
			multiplier: 25,
			basis: "netWorth",
			window: "next12Months",
			terms: "nominal",
		}
		const options = { method: "survival", minBufferMonths: 3, reference } as SurvivalOptions
		const result = financialIndependence(
			fixture.baseline,
			fixture.scenario,
			fixture.timeline,
			options,
		)
		if (!result.ok || !result.financialIndependence.reachable) throw new Error("FI not reachable")
		const { month, reference: found } = result.financialIndependence
		expect({ month, annualExpenses: BigInt(found!.annualExpenses) }).toEqual({
			month: "2026-04-01",
			annualExpenses: 2_587_636n,
		})
		expect(oracleAccountFi(fixture, 3)).toEqual({ month: "2026-04-01", annualExpenses: 2_587_636n })
	})
})
