import { describe, expect, it } from "bun:test"
import { checkReturnModel } from "../check/market"
import { chanceOfSuccess, planReturnModel } from "../index"
import { builtModel, planFixture, planScenario } from "./plan-model-fixture"

const SIZES = [16, 32, 64, 128, 256, 512, 1024]
const fund = { id: "fund", kind: "asset", rate: 700, volatility: 1500 } as const
const timeline = { start: "2026-01-01", horizon: "2027-01-01", resolution: "month" } as const

/** `1 + a year's growth` of a mean month return of `sum / buckets` bps, in tenths of a bp of 10^4 bps: exact. */
function compounded(sum: number, buckets: number): bigint {
	const scale = BigInt(buckets) * 10_000n
	return ((scale + BigInt(sum)) ** 12n * 10n ** 7n) / scale ** 12n
}

describe("planReturnModel", () => {
	it("refuses a bucket count that is no power of two from 16 to 1024", () => {
		for (const buckets of [0, 8, 24, 100, 2048, -16, 16.5, Number.NaN]) {
			const result = planReturnModel(planScenario([fund]), { buckets })
			expect(result).toEqual({
				ok: false,
				problems: [{ code: "INVALID_BUCKETS", path: ["options", "buckets"] }],
			})
		}
		expect(planReturnModel(planScenario([fund]), {} as { buckets: number }).ok).toBe(false)
	})

	it("weighs every bucket exactly 2^32 / buckets and passes checkReturnModel", () => {
		for (const buckets of SIZES) {
			const model = builtModel([fund], buckets)
			expect(model.buckets).toHaveLength(buckets)
			expect(model.buckets.every((bucket) => bucket.weight === 2 ** 32 / buckets)).toBe(true)
			expect(checkReturnModel(model, ["fund"], timeline)).toEqual([])
		}
	})

	it("compounds a 7 per cent, 15 per cent volatility Account's mean month return to 7 per cent within 1 bp", () => {
		for (const buckets of SIZES) {
			const sum = builtModel([fund], buckets).buckets.reduce((s, b) => s + b.returnsBps[0]!, 0)
			// 1.07 a year is 10,700,000 in 10^-3 bp; one bp is 1000.
			const error = compounded(sum, buckets) - 10_700_000n
			expect(error < 1000n && error > -1000n).toBe(true)
		}
	})

	it("states a 7 per cent, 15 per cent volatility Account by hand: 57 bps a month, 433 bps swing", () => {
		const returns = builtModel([fund], 16).buckets.map((bucket) => bucket.returnsBps[0])
		// 56.54 + z * 433.01 for z = -1.8627 and 1.8627, rounded to whole bps.
		expect(returns[0]).toBe(-750)
		expect(returns[15]).toBe(863)
	})

	it("leaves an Account with no volatility, or 0, out of the model so it keeps its own rate", () => {
		const accounts = [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "bonds", kind: "asset", rate: 300, volatility: 0 },
			{ id: "debt", kind: "liability", rate: 500 },
			fund,
		] as const
		const model = builtModel(accounts, 16)
		expect(model.accounts).toEqual(["fund"])
		expect(model.buckets.every((bucket) => bucket.returnsBps.length === 1)).toBe(true)
		const none = builtModel(accounts.slice(0, 3), 16)
		expect(none.accounts).toEqual([])
		expect(none.buckets.every((bucket) => bucket.returnsBps.length === 0)).toBe(true)
	})

	it("moves two volatile Accounts together: one draw, scaled by each volatility", () => {
		const bonds = { id: "bonds", kind: "asset", rate: 300, volatility: 500 } as const
		const model = builtModel([fund, bonds], 64)
		const wide = model.buckets.map((bucket) => bucket.returnsBps[0]!)
		const narrow = model.buckets.map((bucket) => bucket.returnsBps[1]!)
		for (let index = 1; index < 64; index++) {
			// Never opposite: when one rises across buckets, the other does not fall by more than a rounded bp.
			expect(Math.sign(wide[index]! - wide[index - 1]!)).toBeGreaterThan(0)
			expect(narrow[index]! - narrow[index - 1]!).toBeGreaterThanOrEqual(-1)
		}
		// 1500 / 500 = 3: the funds' deviation from its mean is 3 times the bonds' within rounding.
		const meanWide = wide.reduce((s, v) => s + v, 0) / 64
		const meanNarrow = narrow.reduce((s, v) => s + v, 0) / 64
		wide.forEach((value, index) => {
			const ratio = value - meanWide - 3 * (narrow[index]! - meanNarrow)
			expect(Math.abs(ratio)).toBeLessThanOrEqual(4)
		})
	})

	it("counts a clamp to the model's range in the notes: a fall past -9999 and a rise past +10000", () => {
		const falling = { id: "falling", kind: "asset", rate: -9000, volatility: 10_000 } as const
		const rising = { id: "rising", kind: "asset", rate: 100_000, volatility: 10_000 } as const
		const calm = { id: "calm", kind: "asset", rate: 700, volatility: 1500 } as const
		const result = planReturnModel(planScenario([falling, rising, calm]), { buckets: 1024 })
		if (!result.ok) throw new Error("refused")
		expect(result.notes).toEqual([
			{ account: "falling", clamped: 2 },
			{ account: "rising", clamped: 4 },
		])
		const column = (index: number) =>
			result.model.buckets.map((bucket) => bucket.returnsBps[index]!)
		expect(Math.min(...column(0))).toBe(-9999)
		expect(Math.max(...column(1))).toBe(10_000)
		expect(checkReturnModel(result.model, ["falling", "rising", "calm"], timeline)).toEqual([])
	})

	it("builds a byte-identical model every time", () => {
		const first = JSON.stringify(planReturnModel(planScenario([fund]), { buckets: 256 }))
		expect(JSON.stringify(planReturnModel(planScenario([fund]), { buckets: 256 }))).toBe(first)
	})

	it("gives a chance of success on the built model that is byte-identical across two runs", () => {
		const fixture = planFixture([{ id: "cash", kind: "asset", rate: 0 }, fund])
		const model = builtModel([fund], 256)
		const options = { model, seed: "0123456789abcdef", paths: 200 }
		const run = () =>
			JSON.stringify(chanceOfSuccess(fixture.baseline, fixture.scenario, fixture.timeline, options))
		const first = run()
		expect(first.startsWith('{"ok":true')).toBe(true)
		expect(run()).toBe(first)
	})
})
