import { describe, expect, it } from "bun:test"
import { makeFixture } from "../engine/test-helpers"
import { fund, payingSetup } from "../engine/test-payout"
import { chanceOfSuccess } from "../index"
import type { ReturnModel } from "../types"

const FULL = 4294967296

/** The fund returns 3,100 bps over a 31-day month, so a held day earns 100 bps; cash earns nothing. */
const rising: ReturnModel = {
	id: "rising",
	accounts: ["cash", "fund"],
	buckets: [{ returnsBps: [0, 3100], weight: FULL }],
}

describe("chance of success with a payout on an Account that follows a Return series", () => {
	// A 1% a month payout (1200 bps, monthly) of 1,000,000,000. On 31 Jan the series has held 30 of the
	// January row's 31 days: 1,000,000,000 x (310000 + 3100 x 30) / 310000 = 1,300,000,000, paid
	// 13,000,000, leaving 1,287,000,000. The 13,000,000 takes its last day of growth with it, so 987,000,000
	// still earns 100 bps: 1,296,870,000 on 1 Feb. On 28 Feb the February row holds 27 of its 28 days, so it
	// takes 27/28 of the month's return: 1,296,870,000 x (280000 + 3100 x 27) / 280000 = 1,684,541,496, paid
	// 16,845,415, leaving 1,667,696,081. Net worth ends at that and the cash 13,000,000 + 16,845,415, which is
	// 1,697,541,496, on every path.
	const setup = payingSetup([fund({ bps: 1200, frequency: "monthly" })], {
		horizon: "2026-02-28",
		resolution: "month",
	})
	const { baseline, scenario, timeline } = makeFixture(setup)
	const result = chanceOfSuccess(baseline, scenario, timeline, {
		model: rising,
		seed: "0000000000000000",
		paths: 3,
	})

	it("pays out of each path's own valuation and keeps the rest growing on it", () => {
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		const last = result.chance.bands[0]?.netWorth.map((point) => point.value)
		expect(last).toEqual(Array(5).fill(1_697_541_496))
		expect(result.chance.successBps).toBe(10_000)
	})
})
