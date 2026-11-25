import { describe, expect, test } from "bun:test"
import { barHeights } from "./bars"

describe("barHeights", () => {
	test("scales each value to the largest, so the largest bar is the full height", () => {
		expect(barHeights([0, 2, 4], 100)).toEqual([0, 50, 100])
	})

	test("draws no bars when no value is above zero", () => {
		expect(barHeights([0, 0], 100)).toEqual([0, 0])
		expect(barHeights([], 100)).toEqual([])
	})
})
