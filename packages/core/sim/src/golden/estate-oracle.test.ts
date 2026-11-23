import { describe, expect, it } from "bun:test"
import { growthYears } from "../calendar/arith"
import { project } from "../engine/project"
import { ACCOUNTS, growingHousehold, household, withEstate } from "../estate/test-household"
import type { Fixture } from "../fixtures/fixture"
import type { Estate, ProjectionRow } from "../types"
import { oracleCountedDays } from "./oracle-date"
import { type OracleWorth, oracleEstate, oracleReal } from "./oracle-estate"

const BLOCKS: readonly Estate[] = [
	{},
	{ costs: [{ id: "a", of: "gross", bps: 333, rounding: "ceil" }] },
	{
		costs: [
			{ id: "a", of: { accounts: ["home", "fund"] }, bps: 777, rounding: "floor" },
			{ id: "b", amount: 123_457, growth: { bps: -250 } },
		],
		gifts: [{ id: "g", of: "net", bps: 2500, rounding: "halfUp" }],
	},
	{
		costs: [{ id: "a", of: "gross", bps: 10_000, rounding: "halfUp" }],
		gifts: [{ id: "g", of: "net", bps: 10_000, rounding: "halfUp" }],
	},
	{
		costs: [{ id: "a", amount: 9_000_000, growth: "inflation" }],
		gifts: [
			{ id: "g1", amount: 1, growth: "inflation" },
			{ id: "g2", of: "net", bps: 5000, rounding: "ceil" },
		],
	},
	{
		gifts: [
			{ id: "g1", of: "net", bps: 6000, rounding: "halfUp" },
			{ id: "g2", of: "net", bps: 6000, rounding: "halfUp" },
			{ id: "g3", amount: 5, growth: "inflation" },
		],
	},
]

function worthOf(row: ProjectionRow): OracleWorth {
	const assets: Record<string, bigint> = {}
	const owed: Record<string, bigint> = {}
	for (const balance of row.balances) {
		const kind = ACCOUNTS.find((account) => account.id === balance.account)!.kind
		;(kind === "asset" ? assets : owed)[balance.account] = BigInt(balance.amount)
	}
	return { assets, owed }
}

function agreement(fixture: Fixture, years: (row: ProjectionRow) => number): void {
	const result = project(fixture.baseline, fixture.scenario, fixture.timeline, { estate: true })
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	const { rows, estate } = result.projection
	expect(estate!.map((statement) => statement.date)).toEqual(rows.map((row) => row.date))
	rows.forEach((row, index) => {
		const at = { years: years(row), inflation: fixture.scenario.economy.inflation }
		const want = oracleEstate(worthOf(row), fixture.scenario.estate, at)
		const got = estate![index]!
		expect(BigInt(got.gross)).toBe(want.gross)
		expect(BigInt(got.debts)).toBe(want.debts)
		expect(got.costs.map((line) => BigInt(line.amount))).toEqual([...want.costs])
		expect(BigInt(got.net)).toBe(want.net)
		expect(got.gifts.map((line) => BigInt(line.amount))).toEqual([...want.gifts])
		expect(BigInt(got.toHeirs)).toBe(want.toHeirs)
		const days = oracleCountedDays(fixture.timeline.start, row.date)
		const real = oracleReal(BigInt(row.realNetWorth), want, days, at.inflation)
		expect([row.date, BigInt(got.real.net)]).toEqual([row.date, real.net])
		expect([row.date, BigInt(got.real.toHeirs)]).toEqual([row.date, real.toHeirs])
	})
}

describe("the Estate statement against the independent oracle", () => {
	it.each(BLOCKS.map((block, index) => [index, block] as const))(
		"block %d agrees on every monthly row",
		(_, block) => {
			const fixture = withEstate(household(), block)
			agreement(fixture, (row) => growthYears(fixture.timeline.start, row.date))
		},
	)

	it.each([false, true])(
		"growing balances agree on every monthly row, nominal and real (loan repaid: %p)",
		(repaid) => {
			for (const block of BLOCKS) {
				const fixture = withEstate(growingHousehold(repaid), block)
				agreement(fixture, (row) => growthYears(fixture.timeline.start, row.date))
			}
		},
	)
})
