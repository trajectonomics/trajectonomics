import { describe, expect, it } from "bun:test"
import { tileableNoise } from "./noise"

describe("the tileable noise", () => {
	it("wraps at the tile's edge, so a repeated tile has no seam", () => {
		for (const seed of [0, 5, 42]) {
			expect(tileableNoise(0, 0.37, seed)).toBeCloseTo(tileableNoise(1, 0.37, seed), 10)
			expect(tileableNoise(0.62, 0, seed)).toBeCloseTo(tileableNoise(0.62, 1, seed), 10)
		}
	})

	it("holds its values between nothing and one", () => {
		for (let step = 0; step <= 32; step += 1) {
			const value = tileableNoise(step / 32, ((step * 7) % 32) / 32, 3)
			expect(value).toBeGreaterThanOrEqual(0)
			expect(value).toBeLessThanOrEqual(1)
		}
	})

	it("prints the same noise for the same seed, and another for another", () => {
		expect(tileableNoise(0.31, 0.77, 8)).toBe(tileableNoise(0.31, 0.77, 8))
		expect(tileableNoise(0.31, 0.77, 8)).not.toBe(tileableNoise(0.31, 0.77, 9))
	})
})
