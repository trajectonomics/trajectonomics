import { describe, expect, it } from "bun:test"
import { expense, income } from "../engine/test-flows"
import { makeFixture, type Setup } from "../engine/test-helpers"
import type { Flow, Milestone } from "../types"
import { oracleWalk } from "./oracle-milestone-walk"

const monthly = { frequency: "monthly", start: "2026-01-01" } as const

function setup(overrides: Partial<Setup>): Setup {
	return {
		accounts: [{ id: "cash", kind: "asset", rate: 0 }],
		balances: { cash: 1000 },
		flows: [expense("food", 100, monthly)],
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2026-06-01",
		resolution: "month",
		...overrides,
	}
}

function walk(setupValue: Setup, flows: readonly Flow[], milestones: readonly Milestone[] = []) {
	const fixture = makeFixture(setupValue)
	const scenario = { ...fixture.scenario, milestones: [...milestones] }
	return () => oracleWalk({ ...fixture, scenario }, flows)
}

describe("the milestone oracle refuses plans outside its scope", () => {
	it("throws on a quarterly Flow, which it would otherwise treat as monthly", () => {
		const quarterly = expense("rent", 300, { frequency: "quarterly", start: "2026-01-01" })
		expect(walk(setup({}), [quarterly])).toThrow("the oracle takes monthly and once Flows only")
	})

	it("throws on a non-zero rate", () => {
		const rated = setup({ accounts: [{ id: "cash", kind: "asset", rate: 500 }] })
		expect(walk(rated, [expense("food", 100, monthly)])).toThrow(
			"the oracle takes rate 0 Accounts only",
		)
	})

	it("throws on a once Flow whose startAt fires after its start, which the engine defers", () => {
		// Salary 500 each month makes 'rich' (net worth 1,500) fire on 1 Feb, after the bonus starts on 1 Jan.
		const rich: Milestone = {
			id: "rich",
			combine: "all",
			criteria: [
				{
					id: "c",
					kind: "metric",
					metric: "netWorth",
					op: "atLeast",
					amount: 1500,
					terms: "nominal",
				},
			],
		}
		const bonus = income("bonus", 5000, { frequency: "once", start: "2026-01-01", startAt: "rich" })
		expect(
			walk(setup({ balances: { cash: 1000 } }), [bonus, income("salary", 500, monthly)], [rich]),
		).toThrow("the oracle does not defer a once Flow to its startAt fire date")
	})
})
