import { describe, expect, it } from "bun:test"
import { calendarYears, twoBuckets } from "../chance/path-fixture"
import { projectPath } from "../index"
import { marketPath } from "../market/paths"
import type { ReturnModel } from "../types"
import { makeFixture } from "./test-helpers"

const SEED = "0000000000000000"
const FULL = 4294967296

/**
 * The fund's and the bond's return over a year of twelve whole months, by how many of the twelve were
 * good months (+1,000 and +100 bps) rather than bad ones (-2,000 and -50), computed by hand as
 * `1.1^k × 0.8^(12-k) - 1` and `1.01^k × 0.995^(12-k) - 1`, rounded half away from zero.
 */
const BY_GOOD_MONTHS: readonly (readonly [number, number])[] = [
	[-9313, -584],
	[-9055, -442],
	[-8701, -298],
	[-8214, -151],
	[-7544, -3],
	[-6623, 148],
	[-5356, 301],
	[-3614, 456],
	[-1220, 614],
	[2073, 774],
	[6600, 936],
	[12825, 1101],
	[21384, 1268],
]

describe("the returns of a Market path", () => {
	it("compounds the twelve months drawn, per Account, on a two-bucket model", () => {
		const { baseline, scenario, timeline } = calendarYears
		const selection = { model: twoBuckets, seed: SEED, paths: 10, index: 7 }
		const result = projectPath(baseline, scenario, timeline, selection)
		if (!result.ok) throw new Error("refused")
		const fund = marketPath(twoBuckets, 0n, 7, timeline).series[0]!.rows
		expect(result.projection.returns.length).toBe(4)
		for (const [year, entry] of result.projection.returns.slice(0, 3).entries()) {
			const good = fund
				.slice(year * 12, year * 12 + 12)
				.filter((row) => row.returnBps === 1000).length
			const [fundBps, bondBps] = BY_GOOD_MONTHS[good]!
			expect(entry.accounts).toEqual([
				{ account: "fund", returnBps: fundBps },
				{ account: "bond", returnBps: bondBps },
			])
		}
		expect(result.projection.returns[3]!.accounts.map((item) => item.returnBps)).toEqual([0, 0])
	})

	it("is 1,268 bps for twelve months of 100 bps: 1.01^12 − 1 = 12.6825%", () => {
		const model: ReturnModel = {
			id: "steady",
			accounts: ["fund", "bond"],
			buckets: [{ returnsBps: [100, 100], weight: FULL }],
		}
		const { baseline, scenario, timeline } = calendarYears
		const result = projectPath(baseline, scenario, timeline, {
			model,
			seed: SEED,
			paths: 1,
			index: 0,
		})
		if (!result.ok) throw new Error("refused")
		expect(result.projection.returns.map((entry) => entry.accounts[0]!.returnBps)).toEqual([
			1268, 1268, 1268, 0,
		])
	})

	it("takes a share of a month a roll-up holds only part of", () => {
		// 3,100 bps a month from Jan 16: the first roll-up holds 16/31 of January, eleven whole months
		// and 15/31 of the next January: 1.16 × 1.31^11 × 1.15 − 1 = 25.00998 → 250,100 bps.
		// The last roll-up is the horizon day alone, which grows into nothing: 0.
		const model: ReturnModel = {
			id: "steady",
			accounts: ["fund"],
			buckets: [{ returnsBps: [3100], weight: FULL }],
		}
		const { baseline, scenario, timeline } = makeFixture({
			accounts: [{ id: "fund", kind: "asset", rate: 0 }],
			balances: { fund: 1_000 },
			surplus: [{ account: "fund" }],
			start: "2027-01-16",
			horizon: "2028-01-16",
			resolution: "month",
		})
		const result = projectPath(baseline, scenario, timeline, {
			model,
			seed: SEED,
			paths: 1,
			index: 0,
		})
		if (!result.ok) throw new Error("refused")
		expect(result.projection.returns.map((entry) => entry.accounts[0]!.returnBps)).toEqual([
			250100, 0,
		])
	})

	it.each([
		["a month split across roll-ups multiplies back to 1 + r", 3100, 245420],
		["1.1^12 − 1 for 1,000 bps from the 16th", 1000, 21384],
	])("%s", (_, bps, expected) => {
		// Roll-up 1 opens on Jan 16 2028, in the middle of the January row that roll-up 0 started: the
		// two halves of that month multiply to the whole month, so twelve months compound exactly.
		const model: ReturnModel = {
			id: "steady",
			accounts: ["fund"],
			buckets: [{ returnsBps: [bps], weight: FULL }],
		}
		const { baseline, scenario, timeline } = makeFixture({
			accounts: [{ id: "fund", kind: "asset", rate: 0 }],
			balances: { fund: 1_000 },
			surplus: [{ account: "fund" }],
			start: "2027-01-16",
			horizon: "2029-01-16",
			resolution: "month",
		})
		const selection = { model, seed: SEED, paths: 1, index: 0 }
		const result = projectPath(baseline, scenario, timeline, selection)
		if (!result.ok) throw new Error("refused")
		expect(result.projection.returns[1]!.accounts[0]!.returnBps).toBe(expected)
	})
})
