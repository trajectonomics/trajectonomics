import { describe, expect, test } from "bun:test"
import { apiValuePerDollar, tokensPerDollar } from "./value"

describe("tokensPerDollar", () => {
	test("divides the week's tokens by the weekly price", () => {
		expect(tokensPerDollar(1_000_000, 5)).toBe(200_000)
	})

	test("is null for a free plan, where there is nothing to divide by", () => {
		expect(tokensPerDollar(1_000_000, 0)).toBeNull()
	})

	test("is null when a part is unknown", () => {
		expect(tokensPerDollar(null, 5)).toBeNull()
		expect(tokensPerDollar(1_000_000, null)).toBeNull()
	})
})

describe("apiValuePerDollar", () => {
	test("prices the week's tokens at the blended API price", () => {
		expect(apiValuePerDollar(1_000_000, 0.000005, 5)).toBe(1)
	})

	test("is null when the plan has no priced model", () => {
		expect(apiValuePerDollar(1_000_000, null, 5)).toBeNull()
	})

	test("is null for a free plan or an empty week", () => {
		expect(apiValuePerDollar(1_000_000, 0.000005, 0)).toBeNull()
		expect(apiValuePerDollar(0, 0.000005, 5)).toBeNull()
	})
})
