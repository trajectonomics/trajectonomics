import { describe, expect, it } from "bun:test"
import { fund } from "../engine/test-fee"
import { makeFixture } from "../engine/test-helpers"
import { payingSetup } from "../engine/test-payout"
import { chanceOfSuccess } from "../index"
import type { AssetRule, ReturnModel } from "../types"

const FULL = 4294967296
const HALF = 2147483648

/** The fund returns 3,100 bps over a 31-day month, so a held day earns 100 bps; cash earns nothing. */
const rising: ReturnModel = {
	id: "rising",
	accounts: ["cash", "fund"],
	buckets: [{ returnsBps: [0, 3100], weight: FULL }],
}

/** A flat month and a -15% month for the fund, equally weighted. */
const swinging: ReturnModel = {
	id: "swinging",
	accounts: ["cash", "fund"],
	buckets: [
		{ returnsBps: [0, 0], weight: HALF },
		{ returnsBps: [0, -1500], weight: HALF },
	],
}

function chance(account: AssetRule, model: ReturnModel, horizon: string) {
	const setup = payingSetup([account], { horizon, resolution: "month" })
	const { baseline, scenario, timeline } = makeFixture(setup)
	const result = chanceOfSuccess(baseline, scenario, timeline, {
		model,
		seed: "0123456789abcdef",
		paths: 8,
	})
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.chance
}

const plain: AssetRule = { id: "fund", kind: "asset", rate: 0 }

describe("a fee on an Account that follows a Return series", () => {
	// Without a fee the same path ends at 1,000,000,000 x 1.31 x (1 + 0.31 x 27/28) = 1,701,596,429: the
	// February row holds 27 of its 28 days, so it takes 27/28 of the month's return. A 1,200 bps fee is 1% a month.
	// On 31 Jan the series has held 30 of January's 31 days: 1,000,000,000 x (310000 + 3100 x 30) / 310000
	// = 1,300,000,000, charged 13,000,000, leaving 1,287,000,000. The 13,000,000 leaves no growth for the rest of the row:
	// 987,000,000 still earns 100 bps for the last day, so 1,296,870,000 on 1 Feb. On 28 Feb the row's 27 days
	// give 1,296,870,000 x (280000 + 3100 x 27) / 280000 = 1,684,541,496, charged 16,845,415, leaving 1,667,696,081.
	it("charges each path's own value: 13,000,000 then 16,845,415, ending at 1,667,696,081", () => {
		const ended = chance(fund({ bps: 1200 }), rising, "2026-02-28")
		expect(ended.bands[0]?.netWorth.map((point) => point.value)).toEqual(
			Array(5).fill(1_667_696_081),
		)
		expect(chance(plain, rising, "2026-02-28").bands[0]?.netWorth.at(-1)?.value).toBe(1_701_596_429)
	})

	it("lowers every Band against the same seed without it", () => {
		const free = chance(plain, swinging, "2027-12-31")
		const charged = chance(fund({ bps: 150 }), swinging, "2027-12-31")
		const [before, after] = [free.bands[0]!.netWorth, charged.bands[0]!.netWorth]
		expect(after.length).toBe(before.length)
		expect(after.every((point, index) => point.value < before[index]!.value || index === 0)).toBe(
			true,
		)
	})
})
