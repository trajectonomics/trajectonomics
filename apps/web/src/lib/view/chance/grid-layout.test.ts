import { describe, expect, test } from "bun:test"
import { chanceGridLayout } from "./grid-layout"

describe("chanceGridLayout", () => {
	test("fits 200 paths in a box a third as tall as it is wide, with a gap of 15% of a cell", () => {
		const grid = chanceGridLayout(200, 1000, 240)
		expect(grid.cols).toBe(29)
		expect(grid.rows).toBe(7)
		expect(grid.cell).toBeCloseTo(240 / 7, 10)
		expect(grid.gap).toBeCloseTo((240 / 7) * 0.15, 10)
		expect(grid.size).toBeCloseTo((240 / 7) * 0.85, 10)
		expect(grid.x).toBeCloseTo((1000 - 29 * (240 / 7)) / 2, 10)
		expect(grid.y).toBeCloseTo(0, 10)
	})

	test("keeps 10,000 paths inside the same box", () => {
		const grid = chanceGridLayout(10_000, 1000, 240)
		expect(grid.cols).toBe(205)
		expect(grid.rows).toBe(49)
		expect(grid.cell).toBeCloseTo(1000 / 205, 10)
		expect(grid.x).toBe(0)
		expect(grid.y).toBeCloseTo((240 - 49 * (1000 / 205)) / 2, 10)
	})

	test("takes one path and no paths as one row, never dividing by zero", () => {
		for (const paths of [1, 0, -3]) {
			const grid = chanceGridLayout(paths, 1000, 240)
			expect(grid.rows).toBe(1)
			expect(grid.cols).toBe(3)
			expect(grid.size).toBeGreaterThan(0)
		}
	})
})
