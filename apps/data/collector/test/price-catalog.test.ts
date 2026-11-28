import { describe, expect, test } from "bun:test"
import {
	MODEL_PRICES,
	type ModelPrice,
	modelKey,
	modelPriceOn,
	PLAN_PRICES,
	type PlanPrice,
	PRICE_READ,
	planPriceOn,
	tokenCost,
} from "../src/price-catalog"
import { TIERS } from "../src/tiers"

function pricedPlans(): [string, readonly PlanPrice[]][] {
	const entries: [string, readonly PlanPrice[]][] = []
	for (const [plan, prices] of Object.entries(PLAN_PRICES)) {
		if (prices !== undefined) entries.push([plan, prices])
	}
	return entries
}

function currentTier(plan: string): string | null {
	const tiers = TIERS[plan as keyof typeof TIERS] ?? []
	return tiers.find((tier) => tier.to === null)?.name ?? null
}

function expectPriceSource(entry: PlanPrice): void {
	if (entry.usdMonth === null || entry.usdMonth === 0) return
	expect(entry.source).not.toBeNull()
	if (entry.source === null) return
	expect(entry.source.url.startsWith("https://")).toBe(true)
	expect(entry.source.read).toBe(PRICE_READ)
	expect(entry.source.quote.trim().length).toBeGreaterThan(0)
}

describe("the plan price catalogue", () => {
	test("gives every stated price a dated public source", () => {
		for (const [, prices] of pricedPlans()) {
			for (const entry of prices) expectPriceSource(entry)
		}
	})

	test("keeps every plan's tier names unique", () => {
		for (const [, prices] of pricedPlans()) {
			const names = prices.map((entry) => entry.tier)
			expect(new Set(names).size).toBe(names.length)
		}
	})

	test("prices the current tier of every plan it catalogues", () => {
		for (const [plan, prices] of pricedPlans()) {
			const tier = currentTier(plan)
			if (tier === null) continue
			expect(prices.some((entry) => entry.tier === tier)).toBe(true)
		}
	})

	test("reads the stated monthly figures", () => {
		expect(planPriceOn("claude", "Max")?.usdMonth).toBe(100)
		expect(planPriceOn("opencode-go", "Go")?.usdMonth).toBe(10)
		expect(planPriceOn("opencode-go", "Go Plus")?.usdMonth).toBe(40)
		expect(planPriceOn("cursor", "Ultra")?.usdMonth).toBe(200)
		expect(planPriceOn("command-code", "GOAT")?.usdMonth).toBe(10)
		expect(planPriceOn("mistral", "Pro")?.usdMonth).toBe(14.99)
		expect(planPriceOn("opencode-free", "Free")?.usdMonth).toBe(0)
	})

	test("keeps a tier with no official price unpriced", () => {
		expect(planPriceOn("antigravity", "Google AI Pro")?.usdMonth).toBeNull()
		expect(planPriceOn("meta", "Muse")).toBeNull()
		expect(planPriceOn("claude", null)).toBeNull()
	})
})

describe("the model price catalogue", () => {
	test("gives every model a dated public source and four figures", () => {
		for (const [id, price] of Object.entries(MODEL_PRICES)) {
			expect(id).toBe(modelKey(id))
			expect(price.source.url.startsWith("https://")).toBe(true)
			expect(price.source.read).toBe(PRICE_READ)
			expect(price.source.quote.trim().length).toBeGreaterThan(0)
			expect(price.input).toBeGreaterThan(0)
			expect(price.output).toBeGreaterThan(0)
			expect(price.cacheRead).toBeGreaterThan(0)
		}
	})

	test("reads the list prices per million tokens", () => {
		expect(modelPriceOn("claude-opus-5-5")).toMatchObject({
			input: 4,
			output: 20,
			cacheRead: 0.2,
			cacheWrite: 5,
		})
		expect(modelPriceOn("deepseek-v4.1-flash")?.cacheWrite).toBeNull()
		expect(modelPriceOn("gemini-4-hydrogen")?.cacheRead).toBe(0.075)
	})

	test("drops a provider prefix from a usage row's model id", () => {
		expect(modelKey("deepseek/deepseek-v4.1-flash")).toBe("deepseek-v4.1-flash")
		expect(modelPriceOn("deepseek/deepseek-v4.1-flash")?.input).toBe(0.15)
		expect(modelPriceOn("opencode/gemini/gemini-4-argon")?.output).toBe(10)
	})

	test("gives an unknown model no price", () => {
		expect(modelPriceOn("made-up-model")).toBeNull()
	})
})

describe("tokenCost", () => {
	/** A hand-written price: $4 in, $20 out, $0.20 a cache read and $5 a cache write a million. */
	const price: ModelPrice = {
		input: 4,
		output: 20,
		cacheRead: 0.2,
		cacheWrite: 5,
		source: { url: "", read: "", quote: "" },
	}

	test("prices all four kinds at their list price", () => {
		const cost = tokenCost(
			{
				tokensIn: 1_000_000,
				tokensOut: 1_000_000,
				cacheRead: 2_000_000,
				cacheWrite: 1_000_000,
			},
			price,
		)
		expect(cost).toBeCloseTo(29.4, 6)
	})

	test("prices a cache write at the input price when none is stated", () => {
		const cost = tokenCost(
			{ tokensIn: 1_000_000, tokensOut: null, cacheRead: null, cacheWrite: 1_000_000 },
			{ ...price, cacheWrite: null },
		)
		expect(cost).toBeCloseTo(8, 6)
	})

	test("counts a missing kind as zero", () => {
		expect(
			tokenCost({ tokensIn: 1_000_000, tokensOut: null, cacheRead: null, cacheWrite: null }, price),
		).toBe(4)
	})

	test("has no cost when the row has no input or output to price", () => {
		expect(
			tokenCost({ tokensIn: null, tokensOut: null, cacheRead: 5_000_000, cacheWrite: null }, price),
		).toBeNull()
	})
})
