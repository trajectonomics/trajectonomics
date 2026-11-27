import { describe, expect, test } from "bun:test"
import { monthlyPrice, weeklyPrice, weeklyPriceOf } from "./plan-price"

describe("monthlyPrice", () => {
	test("reads the catalogue's monthly figure for a plan and tier", () => {
		expect(monthlyPrice("claude", "Max")).toBe(100)
		expect(monthlyPrice("opencode-go", "Go Plus")).toBe(40)
	})

	test("is null when the vendor states no price", () => {
		expect(monthlyPrice("antigravity", "Google AI Pro")).toBeNull()
		expect(monthlyPrice("meta", "Muse")).toBeNull()
		expect(monthlyPrice("claude", null)).toBeNull()
	})
})

describe("weeklyPrice", () => {
	test("spreads a monthly price over the weeks of a year", () => {
		expect(weeklyPrice(20)).toBeCloseTo(4.615, 3)
		expect(weeklyPrice(100)).toBeCloseTo(23.077, 3)
	})

	test("keeps a free plan free", () => {
		expect(weeklyPrice(0)).toBe(0)
	})

	test("has no weekly price when the month has none", () => {
		expect(weeklyPrice(null)).toBeNull()
	})
})

describe("weeklyPriceOf", () => {
	test("joins the catalogue's price to the weekly formula", () => {
		expect(weeklyPriceOf("cursor", "Premium")).toBeCloseTo(6.923, 3)
		expect(weeklyPriceOf("opencode-free", "Free")).toBe(0)
	})
})
