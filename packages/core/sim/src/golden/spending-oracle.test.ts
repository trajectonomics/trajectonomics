import { describe, expect, it } from "bun:test"
import { cashPlan } from "../chance/spending-fixture"
import { chanceOfSuccess } from "../index"
import type { ReturnModel } from "../types"
import { type OracleSpendingPlan, oracleSpendingBands } from "./oracle-spending"

const QUARTER = 1073741824
const rule = {
	kind: "currentRate",
	portfolio: ["cash"],
	rateBps: 1000,
	rounding: "halfUp",
} as const

/** A quarter of months lose 25%, the rest gain 1%: portfolios drift apart, and some runs out. */
const model: ReturnModel = {
	id: "drift",
	accounts: ["cash"],
	buckets: [
		{ returnsBps: [-2500], weight: QUARTER },
		{ returnsBps: [100], weight: 3 * QUARTER },
	],
}

function plan(seed: bigint): OracleSpendingPlan {
	return {
		opening: 1_200_000n,
		rent: 10_000n,
		rateBps: 1000n,
		months: 36,
		buckets: [
			{ returnBps: -2500n, weight: BigInt(QUARTER) },
			{ returnBps: 100n, weight: BigInt(3 * QUARTER) },
		],
		seed,
	}
}

describe("spending Bands agree with a brute-force replay of the seeded paths", () => {
	for (const seed of ["0000000000000000", "00000000000000a7", "ffffffffffffffff"]) {
		it(`seed ${seed}: 40 paths over three roll-ups`, () => {
			const { baseline, scenario, timeline } = cashPlan("2028-12-31", rule)
			const result = chanceOfSuccess(baseline, scenario, timeline, { model, seed, paths: 40 })
			if (!result.ok) throw new Error("chance failed")
			const { spending, succeeded } = result.chance
			const oracle = oracleSpendingBands(plan(BigInt(`0x${seed}`)), 40)
			expect(
				spending!.bands.map((band) => band.spending.map((point) => BigInt(point.value))),
			).toEqual(oracle.bands)
			expect(spending!.lowestYear.paths).toBe(oracle.lows.length)
			expect(spending!.lowestYear.spending.map((point) => BigInt(point.value))).toEqual(
				oracle.lowest,
			)
			expect(succeeded).toBeGreaterThan(0)
			expect(succeeded).toBeLessThan(40)
			// The market is wide enough that the Bands are a spread, not one figure repeated.
			expect(new Set(oracle.bands.flat()).size).toBeGreaterThan(6)
		})
	}
})
