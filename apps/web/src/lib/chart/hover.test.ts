import { describe, expect, test } from "bun:test"
import { keyTarget } from "./hover"

describe("keyTarget", () => {
	test("steps one point left and right, and stops at the ends", () => {
		expect(keyTarget("ArrowLeft", 2, 5)).toBe(1)
		expect(keyTarget("ArrowRight", 2, 5)).toBe(3)
		expect(keyTarget("ArrowLeft", 0, 5)).toBe(0)
		expect(keyTarget("ArrowRight", 4, 5)).toBe(4)
	})

	test("jumps to the first and last point with Home and End", () => {
		expect(keyTarget("Home", 3, 5)).toBe(0)
		expect(keyTarget("End", 1, 5)).toBe(4)
	})

	test("ignores other keys, and has nothing to move among no points", () => {
		expect(keyTarget("a", 1, 5)).toBeNull()
		expect(keyTarget("ArrowLeft", 0, 0)).toBeNull()
	})
})
