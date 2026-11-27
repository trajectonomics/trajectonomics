import { describe, expect, test } from "bun:test"
import { type CatalogTier, type PlanCatalog, TIER_CATALOG } from "../src/tier-catalog"
import { TIERS } from "../src/tiers"

function catalogues(): [string, PlanCatalog][] {
	const entries: [string, PlanCatalog][] = []
	for (const [plan, catalog] of Object.entries(TIER_CATALOG)) {
		if (catalog !== undefined) entries.push([plan, catalog])
	}
	return entries
}

function baseOf(catalog: PlanCatalog): CatalogTier {
	const base = catalog.tiers.find((tier) => tier.name === catalog.base)
	if (base === undefined) throw new Error(`no base tier: ${catalog.base}`)
	return base
}

function expectSource(tier: CatalogTier): void {
	const stated = tier.multiplier.fiveHours !== null || tier.multiplier.week !== null
	if (!stated) return
	expect(tier.source).not.toBeNull()
	if (tier.source === null) return
	expect(tier.source.url.startsWith("https://")).toBe(true)
	expect(tier.source.read).toMatch(/^\d{4}-\d{2}-\d{2}$/)
	expect(tier.source.quote.trim().length).toBeGreaterThan(0)
}

describe("the tier catalogue", () => {
	test("keeps every plan's tier names unique", () => {
		for (const [, catalog] of catalogues()) {
			const names = catalog.tiers.map((tier) => tier.name)
			expect(new Set(names).size).toBe(names.length)
		}
	})

	test("states its base tier with a multiplier of one for every window it gives", () => {
		for (const [, catalog] of catalogues()) {
			const base = baseOf(catalog)
			if (base.multiplier.fiveHours !== null) expect(base.multiplier.fiveHours).toBe(1)
			if (base.multiplier.week !== null) expect(base.multiplier.week).toBe(1)
		}
	})

	test("names every tier in the plan table for a catalogued plan", () => {
		for (const [plan, catalog] of catalogues()) {
			const names = catalog.tiers.map((tier) => tier.name)
			for (const tier of TIERS[plan as keyof typeof TIERS]) {
				expect(names).toContain(tier.name)
			}
		}
	})

	test("gives every non-null multiplier a dated public source", () => {
		for (const [, catalog] of catalogues()) {
			for (const tier of catalog.tiers) expectSource(tier)
		}
	})
})
