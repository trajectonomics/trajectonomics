import { describe, expect, test } from "bun:test"
import { catalogSources, defaultTier, planCatalog } from "./plan-catalog"
import type { MeasuredTier } from "./types"

function measured(tier: string, sevenDays: number): MeasuredTier {
	const peak = { tokens: sevenDays, fromDay: "2026-11-24" }
	return { tier, fiveHours: peak, sevenDays: peak, thirtyDays: peak }
}

describe("planCatalog", () => {
	test("names the catalogue of a plan whose vendor states a multiplier", () => {
		expect(planCatalog("claude")?.base).toBe("Pro")
		expect(planCatalog("mistral")).toBeNull()
	})
})

describe("defaultTier", () => {
	const catalog = planCatalog("claude")
	if (catalog === null) throw new Error("Claude has no catalogue")

	test("keeps the current tier when the catalogue names it", () => {
		expect(defaultTier("Max", [], catalog)).toBe("Max")
	})

	test("falls back to the measured tier with the largest week", () => {
		const measuredTiers = [measured("Pro", 100), measured("Max", 500)]
		expect(defaultTier("Max 5x", measuredTiers, catalog)).toBe("Max")
	})

	test("falls back to the base tier when nothing else is named", () => {
		expect(defaultTier(null, [], catalog)).toBe("Pro")
	})
})

describe("catalogSources", () => {
	test("links every vendor page with the day it was read", () => {
		const sources = catalogSources()
		expect(sources.length).toBeGreaterThan(3)
		for (const source of sources) {
			expect(source.url.startsWith("https://")).toBe(true)
			expect(source.read).toBe("2026-11-27")
			expect(source.label.length).toBeGreaterThan(0)
		}
	})
})
