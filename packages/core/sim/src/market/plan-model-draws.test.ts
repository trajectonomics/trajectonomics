import { describe, expect, it } from "bun:test"
import { marketReturns } from "./paths"
import { builtModel } from "./plan-model-fixture"

const fund = { id: "fund", kind: "asset", rate: 700, volatility: 1500 } as const
/** 1200 monthly rows, the most a Market path holds. */
const timeline = { start: "2026-01-01", horizon: "2126-01-01", resolution: "month" } as const
const SEED = 0x0123456789abcdefn

/** Every month return a seeded run draws for the fund, as integers. */
function draws(paths: number, seed: bigint): readonly number[] {
	const model = builtModel([fund], 256)
	const found: number[] = []
	for (const returns of marketReturns(model, seed, paths, timeline)) {
		for (const row of returns.series[0]!.rows) found.push(row.returnBps)
	}
	return found
}

describe("seeded draws from the plan Return model", () => {
	const sample = draws(100, SEED)

	it("are reproducible for a seed and differ for another", () => {
		expect(sample).toHaveLength(120_000)
		expect(draws(100, SEED)).toEqual(sample)
		expect(draws(100, SEED + 1n)).not.toEqual(sample)
	})

	it("have a mean within 5 bps of the stated 56.54 bps a month (4 standard errors of 1.25), in integers", () => {
		const total = sample.reduce((sum, value) => sum + value, 0)
		// |total / N - 56.541| <= 5, as |total * 1000 - N * 56541| <= N * 5000.
		const distance = Math.abs(total * 1000 - sample.length * 56_541)
		expect(distance <= sample.length * 5000).toBe(true)
	})

	it("have a spread within 5 bps of the stated 433 bps a month, in integers", () => {
		const squares = sample.reduce((sum, value) => sum + (value - 57) ** 2, 0)
		// (433 - 5)^2 <= squares / N <= (433 + 5)^2, compared without a division.
		expect(squares >= sample.length * 428 ** 2).toBe(true)
		expect(squares <= sample.length * 438 ** 2).toBe(true)
	})

	it("hit every bucket, so no bucket of the table goes unused", () => {
		expect(new Set(sample).size).toBeGreaterThan(200)
	})
})
