import { describe, expect, it } from "bun:test"
import { forAllSeeded, seededRandom } from "./invariants-random"

function draws(seed: number, count: number): number[] {
	const rng = seededRandom(seed)
	return Array.from({ length: count }, () => rng.int(0, 1_000_000))
}

describe("seeded invariant generator", () => {
	it("repeats the same sequence for the same seed and differs across seeds", () => {
		expect(draws(52_001, 50)).toEqual(draws(52_001, 50))
		expect(draws(52_001, 50)).not.toEqual(draws(52_002, 50))
	})

	it("draws integers inside the inclusive range", () => {
		const rng = seededRandom(7)
		for (let index = 0; index < 500; index++) {
			const value = rng.int(3, 5)
			expect(value).toBeGreaterThanOrEqual(3)
			expect(value).toBeLessThanOrEqual(5)
			expect(Number.isInteger(value)).toBe(true)
		}
	})

	it("returns true for bool(1) and picks only listed items", () => {
		const rng = seededRandom(9)
		expect(rng.bool(1)).toBe(true)
		const items = ["a", "b", "c"] as const
		for (let index = 0; index < 100; index++) {
			expect(items).toContain(rng.pick(items))
		}
	})
})

describe("seeded property runner", () => {
	it("passes silently when the property holds for every case", () => {
		expect(() =>
			forAllSeeded(
				"always true",
				1,
				20,
				(rng) => rng.int(0, 10),
				(value) => expect(value).toBeGreaterThanOrEqual(0),
			),
		).not.toThrow()
	})

	it("reports the property, seed, case index and input of the first failure", () => {
		let message = ""
		try {
			forAllSeeded(
				"never above five",
				52_001,
				50,
				(rng) => rng.int(0, 10),
				(value) => expect(value).toBeLessThanOrEqual(5),
			)
		} catch (error) {
			message = error instanceof Error ? error.message : ""
		}
		expect(message).toContain("never above five violated: seed=52001 case=")
		expect(message).toContain("input=")
	})
})
