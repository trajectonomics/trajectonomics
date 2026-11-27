import { describe, expect, test } from "bun:test"
import { blendedApiCost, modelCost, uncachedTokens } from "./api-value"
import type { TableRow } from "./table"

function row(overrides: Partial<TableRow> = {}): TableRow {
	return {
		plan: "claude",
		planName: "Claude",
		model: "claude-opus-5-5",
		tokensIn: 0,
		tokensOut: 0,
		cacheRead: 0,
		cacheWrite: 0,
		tokensTotal: 0,
		requests: 1,
		daily: false,
		bestEffort: false,
		...overrides,
	}
}

describe("uncachedTokens", () => {
	test("leaves cache reads out of the total", () => {
		expect(uncachedTokens(row({ tokensTotal: 100, cacheRead: 40 }))).toBe(60)
	})

	test("counts the whole total when the source reports no cache reads", () => {
		expect(uncachedTokens(row({ tokensTotal: 100, cacheRead: null }))).toBe(100)
	})
})

describe("modelCost", () => {
	test("prices all four parts per million tokens", () => {
		const cost = modelCost(
			row({
				tokensIn: 1_000_000,
				tokensOut: 1_000_000,
				cacheRead: 2_000_000,
				cacheWrite: 1_000_000,
			}),
			{
				input: 4,
				output: 20,
				cacheRead: 0.2,
				cacheWrite: 5,
				source: { url: "", read: "", quote: "" },
			},
		)
		expect(cost).toBeCloseTo(29.4, 6)
	})

	test("prices a cache write at the input price when no write price is stated", () => {
		const cost = modelCost(row({ cacheWrite: 1_000_000 }), {
			input: 0.15,
			output: 0.6,
			cacheRead: 0.003,
			cacheWrite: null,
			source: { url: "", read: "", quote: "" },
		})
		expect(cost).toBeCloseTo(0.15, 6)
	})
})

describe("blendedApiCost", () => {
	test("leaves out a row with no input/output split", () => {
		const split = row({
			model: "claude-opus-5-5",
			tokensIn: 1_000_000,
			tokensOut: 0,
			cacheRead: 0,
			cacheWrite: 0,
			tokensTotal: 1_000_000,
		})
		const daily = row({
			model: "claude-opus-5-5",
			tokensIn: null,
			tokensOut: null,
			cacheRead: null,
			cacheWrite: null,
			tokensTotal: 9_000_000,
		})
		expect(blendedApiCost([split, daily])).toBe(blendedApiCost([split]))
	})

	test("prices no model named after an object member", () => {
		expect(blendedApiCost([row({ model: "constructor" })])).toBeNull()
	})

	test("divides the priced rows' cost by their uncached tokens", () => {
		const cost = blendedApiCost([
			row({
				model: "claude-opus-5-5",
				tokensIn: 1_000_000,
				tokensOut: 1_000_000,
				cacheRead: 1_000_000,
				tokensTotal: 3_000_000,
			}),
		])
		expect(cost).toBeCloseTo(24.2 / 2_000_000, 12)
	})

	test("leaves out a model with no price", () => {
		const withUnknown = blendedApiCost([
			row({ model: "claude-opus-5-5", tokensIn: 1_000_000, tokensTotal: 1_000_000 }),
			row({ model: "made-up-model", tokensIn: 9_000_000, tokensTotal: 9_000_000 }),
		])
		expect(withUnknown).toBeCloseTo(4 / 1_000_000, 12)
	})

	test("is null when none of the plan's models has a price", () => {
		expect(blendedApiCost([row({ model: "made-up-model", tokensTotal: 10 })])).toBeNull()
	})

	test("is null when the priced rows carry no uncached tokens", () => {
		expect(blendedApiCost([row({ model: "claude-opus-5-5", tokensTotal: 0 })])).toBeNull()
	})

	test("match a model id that carries a provider prefix", () => {
		const cost = blendedApiCost([
			row({ model: "anthropic/claude-opus-5-5", tokensIn: 1_000_000, tokensTotal: 1_000_000 }),
		])
		expect(cost).toBeCloseTo(4 / 1_000_000, 12)
	})
})
