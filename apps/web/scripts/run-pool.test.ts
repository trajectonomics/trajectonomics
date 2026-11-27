import { describe, expect, test } from "bun:test"
import { mapPool, recordPool } from "./run-pool"

describe("mapPool", () => {
	test("preserves input order while capping concurrent work", async () => {
		let active = 0
		let peak = 0
		const results = await mapPool(
			[30, 10, 20, 5, 15, 25],
			async (delay, index) => {
				active += 1
				peak = Math.max(peak, active)
				await Bun.sleep(delay)
				active -= 1
				return `${index}:${delay}`
			},
			2,
		)
		expect(peak).toBe(2)
		expect(results).toEqual(["0:30", "1:10", "2:20", "3:5", "4:15", "5:25"])
	})

	test("returns an empty array for empty input", async () => {
		expect(await mapPool([], async (x: number) => x)).toEqual([])
	})
})

describe("recordPool", () => {
	test("preserves key order", async () => {
		const out = await recordPool(
			{ alpha: 20, beta: 5, gamma: 10 },
			async (delay, key) => {
				await Bun.sleep(delay)
				return `${key}=${delay}`
			},
			2,
		)
		expect(Object.keys(out)).toEqual(["alpha", "beta", "gamma"])
		expect(out).toEqual({ alpha: "alpha=20", beta: "beta=5", gamma: "gamma=10" })
	})
})
