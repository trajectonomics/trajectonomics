import { describe, expect, it } from "bun:test"
import { type RuleSetup, statement } from "./rule-fixture"

const base = { portfolio: ["inv"], rateBps: 400, rounding: "halfUp" } as const
const level = { rule: { kind: "currentRate", ...base }, inflation: 300 } as const

describe("a Rule year states its amount and what it paid in today's money (ADR 0023)", () => {
	it("deflates 4,000,000 by 3% at each year's first date: 4,000,000, 3,883,495 and 3,770,384", () => {
		// 4,000,000 / 1.03 = 3,883,495.14 and 4,000,000 / 1.03^2 = 3,770,383.7, each rounded half up once.
		const { years } = statement(level)
		expect(years.map((year) => year.amount)).toEqual([4_000_000, 4_000_000, 4_000_000])
		expect(years.map((year) => year.real.amount)).toEqual([4_000_000, 3_883_495, 3_770_384])
		expect(years.map((year) => year.real.paid)).toEqual([4_000_000, 3_883_495, 3_770_384])
	})

	it("deflates the paid sum once, not each part: seven parts of a cut year are 2,333,333, real 2,265,372", () => {
		// 2,333,333 / 1.03 = 2,265,371.8; deflating the seven parts one by one would not give the same sum.
		const last = statement({ ...level, horizon: "2027-07-31" }).years[1]!
		expect(last).toMatchObject({ date: "2027-01-01", amount: 4_000_000, paid: 2_333_333 })
		expect(last.real).toEqual({ amount: 3_883_495, paid: 2_265_372 })
	})

	it("an initialRate year is level in real terms: 4,120,000 at 3% is 4,000,000 today", () => {
		const { years } = statement({ rule: { kind: "initialRate", ...base }, inflation: 300 })
		expect(years.map((year) => year.real.amount)).toEqual([4_000_000, 4_000_000, 4_000_000])
	})
})

const rules: readonly RuleSetup[] = [
	{ rule: { kind: "initialRate", ...base } },
	{ rule: { kind: "currentRate", ...base }, rate: 600 },
	{ rule: { kind: "guardrails", ...base, lower: { bps: 1500, adjustBps: 800 } }, rate: 1800 },
	{ rule: { kind: "currentRate", ...base }, frequency: "annual", rate: 300 },
	{ rule: { kind: "currentRate", ...base }, horizon: "2027-07-31" },
]

describe("with no inflation, today's money is the nominal figure", () => {
	it.each(rules.map((setup, index) => [index, setup] as const))(
		"rule case %p states real = nominal for every Rule year",
		(_, setup) => {
			const { years } = statement({ ...setup, inflation: 0 })
			expect(years.length).toBeGreaterThan(0)
			for (const year of years) {
				expect(year.real).toEqual({ amount: year.amount, paid: year.paid })
			}
		},
	)
})
