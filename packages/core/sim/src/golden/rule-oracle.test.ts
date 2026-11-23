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
	const { balances } = fixture.baseline
	const { scenario, timeline } = fixture
	const log = oracleRuleLog()
	const events = oracleEvents([flow], timeline.start, timeline.horizon, oracleCalendar(fixture))
	const inflation = scenario.economy.inflation
	for (const { date, years } of events) {
		// A portfolio that earns nothing is its opening balance on any date; a growing one is read on
		// the anniversaries of the Timeline start, where its value is a closed form.
		const read = (account: string) =>
			fixture.scenario.accounts.find((item) => item.id === account)?.rate === 0
				? BigInt(balances.find((item) => item.account === account)?.amount ?? 0)
				: oracleAccountAt(fixture, account, date)
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
	[
		"initialRate under a shifting Calendar, where a year is twelve Occurrences, not an anniversary",
		{
			rule: { kind: "initialRate", ...base },
			inflation: 1000,
			start: "2026-01-31",
			calendar: { dayRule: "next", holidays: [] },
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

describe("a Rule year is twelve Occurrences, even where an anniversary falls between two", () => {
	it("starts year 2 on 2027-02-01, the day before the anniversary of 2026-02-02", () => {
		// 2026-01-31 is a Saturday and shifts to 2026-02-02. The 13th Occurrence, 2027-01-31, is a
		// Sunday and lands 2027-02-01, one day before that anniversary. Twelve parts of 4,000,000 are
		// paid in year 1; year 2 is 4,000,000 grown 10%.
		const fixture = ruleFixture({
			rule: { kind: "initialRate", ...base },
			inflation: 1000,
			start: "2026-01-31",
			calendar: { dayRule: "next", holidays: [] },
		})
		const flow = fixture.scenario.flows.find(isRuled)!
		const [first, second] = replay(fixture, flow)
		expect(first).toMatchObject({ date: "2026-02-02", amount: 4_000_000, paid: 4_000_000 })
		expect(second).toMatchObject({ date: "2027-02-01", amount: 4_400_000, paid: 4_400_000 })
		expect(ruled(fixture).spendingRules![0]!.years.map((year) => year.date)).toEqual([
			"2026-02-02",
			"2027-02-01",
			"2028-01-31",
		])
	})
})
