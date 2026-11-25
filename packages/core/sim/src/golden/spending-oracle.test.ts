import { describe, expect, it } from "bun:test"
import { cashPlan } from "../chance/spending-fixture"
import { chanceOfSuccess } from "../index"
import type { ReturnModel, SpendingRule } from "../types"
import type { OracleSpendingPlan } from "./oracle-spending"
import { oracleSpendingBands } from "./oracle-spending-bands"

const QUARTER = 1073741824
const currentRate: SpendingRule = {
	kind: "currentRate",
	portfolio: ["cash"],
	rateBps: 1000,
	rounding: "halfUp",
}
const band = { bps: 1500, adjustBps: 800 }
const guardrails: SpendingRule = { ...currentRate, kind: "guardrails", upper: band, lower: band }

/** A quarter of months lose 25%, the rest gain 1%: portfolios drift apart, and some runs out. */
const model: ReturnModel = {
	id: "drift",
	accounts: ["cash"],
	buckets: [
		{ returnsBps: [-2500], weight: QUARTER },
		{ returnsBps: [100], weight: 3 * QUARTER },
	],
}

interface Case {
	readonly name: string
	readonly rule: SpendingRule
	readonly horizon: string
	readonly months: number
	readonly start?: { readonly date: string; readonly month: number }
	readonly end?: { readonly date: string; readonly month: number }
}

const CASES: readonly Case[] = [
	{
		name: "currentRate, three whole roll-ups",
		rule: currentRate,
		horizon: "2028-12-31",
		months: 36,
	},
	{ name: "guardrails, three whole roll-ups", rule: guardrails, horizon: "2028-12-31", months: 36 },
	{
		name: "currentRate from 2026-10-01, a partial first roll-up",
		rule: currentRate,
		horizon: "2028-12-31",
		months: 36,
		start: { date: "2026-10-01", month: 9 },
	},
	{
		name: "guardrails with a clipped final roll-up",
		rule: guardrails,
		horizon: "2028-06-30",
		months: 30,
	},
	{
		name: "currentRate ending 2027-06-30",
		rule: currentRate,
		horizon: "2028-12-31",
		months: 36,
		end: { date: "2027-06-30", month: 18 },
	},
]

function planOf(entry: Case, seed: bigint): OracleSpendingPlan {
	return {
		opening: 1_200_000n,
		rent: 10_000n,
		rule: entry.rule,
		months: entry.months,
		...(entry.start === undefined ? {} : { ruleStart: entry.start.month }),
		...(entry.end === undefined ? {} : { ruleEnd: entry.end.month }),
		buckets: [
			{ returnBps: -2500n, weight: BigInt(QUARTER) },
			{ returnBps: 100n, weight: BigInt(3 * QUARTER) },
		],
		seed,
	}
}

describe("spending Bands agree with a brute-force replay of the seeded paths", () => {
	for (const entry of CASES) {
		for (const seed of ["0000000000000000", "00000000000000a7", "ffffffffffffffff"]) {
			it(`${entry.name}, seed ${seed}: 40 paths`, () => {
				const fixture = cashPlan(entry.horizon, entry.rule, entry.start?.date, entry.end?.date)
				const { baseline, scenario, timeline } = fixture
				const result = chanceOfSuccess(baseline, scenario, timeline, { model, seed, paths: 40 })
				if (!result.ok) throw new Error("chance failed")
				const { spending } = result.chance
				const oracle = oracleSpendingBands(planOf(entry, BigInt(`0x${seed}`)), 40)
				const read = (points: readonly { readonly value: number }[]) =>
					points.map((point) => BigInt(point.value))
				expect(spending!.bands.map((entry) => read(entry.spending))).toEqual(oracle.bands)
				expect(spending!.lowestYear.paths).toBe(oracle.lows.length)
				expect(read(spending!.lowestYear.spending)).toEqual(oracle.lowest)
				// The market is wide enough that the Bands are a spread, not one figure repeated.
				expect(new Set(oracle.bands.flat()).size).toBeGreaterThan(4)
			})
		}
	}
})
