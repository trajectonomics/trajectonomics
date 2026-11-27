import { describe, expect, test } from "bun:test"
import { createPool, mapPool, mapWithPool, recordPool, recordWithPool } from "./run-pool"

describe("bounded read pool", () => {
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

	test("preserves key order for keyed records", async () => {
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

	test("releases slots after both synchronous throws and rejected promises", async () => {
		const pool = createPool(1)
		const settled = await Promise.allSettled([
			pool(() => {
				throw new Error("sync boom")
			}),
			pool(async () => {
				await Bun.sleep(5)
				throw new Error("async boom")
			}),
			pool(async () => "recovered"),
		])
		expect(settled[0]?.status).toBe("rejected")
		expect(settled[1]?.status).toBe("rejected")
		expect(settled[2]).toEqual({ status: "fulfilled", value: "recovered" })
	})

	test("shares one concurrency cap across map and record helpers and ignores NaN limits", async () => {
		const pool = createPool(2)
		let active = 0
		let peak = 0
		const step = async (label: string) => {
			active += 1
			peak = Math.max(peak, active)
			await Bun.sleep(15)
			active -= 1
			return label
		}
		const [list, rec] = await Promise.all([
			mapWithPool(pool, ["a", "b", "c"], (item) => step(item)),
			recordWithPool(pool, { x: "x", y: "y" }, (item) => step(item)),
		])
		expect(peak).toBe(2)
		expect(list).toEqual(["a", "b", "c"])
		expect(rec).toEqual({ x: "x", y: "y" })
		expect(await mapPool([1, 2], async (n) => n * 2, Number.NaN)).toEqual([2, 4])
	})
})
