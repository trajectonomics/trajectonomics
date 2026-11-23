import { describe, expect, it } from "bun:test"
import { ruled, ruleFixture } from "../engine/rule-fixture"
import type { Fixture } from "../fixtures/fixture"
import type { Flow, SpendingRule } from "../types"
import { isRuled } from "../types"
import { oracleAccountAt } from "./oracle-account"
import { oracleCalendar } from "./oracle-calendar"
import { oracleEvents } from "./oracle-flow"
import { oracleRuleLog, oracleRulePay } from "./oracle-rule"

const base = { portfolio: ["inv"], rateBps: 400, rounding: "halfUp" } as const
const band = { bps: 1500, adjustBps: 800 }

/** Replays the rule Flow Occurrence by Occurrence with the oracle, reading the untouched portfolio in closed form. */
function replay(fixture: Fixture, flow: Flow & { rule: SpendingRule }) {
	const { scenario, timeline } = fixture
	const log = oracleRuleLog()
	const events = oracleEvents([flow], timeline.start, timeline.horizon, oracleCalendar(fixture))
	const inflation = scenario.economy.inflation
	for (const { date, years } of events) {
		const read = (account: string) => oracleAccountAt(fixture, account, date)
		oracleRulePay(log, flow, { date, years, inflation }, read)
	}
	return log.years.map((year) => ({
		date: year.date,
		portfolio: Number(year.portfolio),
		amount: Number(year.amount),
		paid: Number(year.paid),
		action: year.action,
	}))
}

const cases: readonly [string, Parameters<typeof ruleFixture>[0]][] = [
	["initialRate with 3% inflation", { rule: { kind: "initialRate", ...base }, inflation: 300 }],
	["currentRate on a 6% portfolio", { rule: { kind: "currentRate", ...base }, rate: 600 }],
	[
		"currentRate with a step, a floor and a ceiling",
		{
			rule: {
				kind: "currentRate",
				...base,
				steps: [
					{ from: "2027-01-01", bps: 350 },
					{ from: "2028-01-01", bps: 900 },
				],
				floor: { amount: 3_800_000, growth: "inflation" },
				ceiling: { amount: 5_000_000, growth: { bps: 200 } },
			},
			rate: 500,
			inflation: 250,
			horizon: "2030-12-31",
		},
	],
	[
		"guardrails on a falling portfolio, rounded up",
		{
			rule: { kind: "guardrails", ...base, rounding: "ceil", upper: band, lower: band },
			rate: -800,
			inflation: 200,
			horizon: "2031-12-31",
		},
	],
	[
		"guardrails on a rising portfolio, annual",
		{
			rule: { kind: "guardrails", ...base, rounding: "floor", lower: band },
			rate: 1800,
			frequency: "annual",
			horizon: "2031-12-31",
		},
	],
]

describe("each Spending rule agrees with the oracle's replay of its Occurrences", () => {
	for (const [name, setup] of cases) {
		it(name, () => {
			const fixture = ruleFixture(setup)
			const flow = fixture.scenario.flows.find(isRuled)!
			const projection = ruled(fixture)
			const stated = projection.spendingRules![0]!.years.map(
				({ withdrawalRateBps: _, action, ...rest }) => ({ ...rest, action: String(action) }),
			)
			expect(stated).toEqual(replay(fixture, flow))
			const paid = stated.map((year) => year.paid)
			const spent = projection.annual.map((year) => year.expense)
			expect(spent.slice(0, paid.length)).toEqual(paid)
		})
	}
})
