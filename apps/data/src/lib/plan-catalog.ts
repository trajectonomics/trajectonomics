import type { PlanId } from "@trajectonomics/data-collector/plans"
import type { PlanCatalog } from "@trajectonomics/data-collector/tier-catalog"
import { TIER_CATALOG } from "@trajectonomics/data-collector/tier-catalog"
import { planName } from "./plans"
import type { MeasuredTier } from "./types"

/** The catalogue of a plan whose vendor states a multiplier, or null when it states none. */
export function planCatalog(plan: string): PlanCatalog | null {
	if (!Object.hasOwn(TIER_CATALOG, plan)) return null
	return TIER_CATALOG[plan as PlanId] ?? null
}

function hasTier(catalog: PlanCatalog, name: string): boolean {
	return catalog.tiers.some((tier) => tier.name === name)
}

/** The measured tier with the largest seven-day peak that the catalogue also names. */
function measuredTier(measured: readonly MeasuredTier[], catalog: PlanCatalog): string | null {
	let best: { name: string; tokens: number } | null = null
	for (const entry of measured) {
		if (entry.tier === null || !hasTier(catalog, entry.tier)) continue
		const tokens = entry.sevenDays?.tokens ?? -1
		if (best === null || tokens > best.tokens) best = { name: entry.tier, tokens }
	}
	return best?.name ?? null
}

/**
 * The tier a picker starts on: the plan's current tier when the catalogue names it, else the
 * measured tier with the largest seven-day peak, else the plan's base tier.
 */
export function defaultTier(
	current: string | null,
	measured: readonly MeasuredTier[],
	catalog: PlanCatalog,
): string {
	if (current !== null && hasTier(catalog, current)) return current
	return measuredTier(measured, catalog) ?? catalog.base
}

/** One vendor page behind the catalogue, with the day it was read. */
export type CatalogSource = {
	name: string
	label: string
	url: string
	read: string
}

/** Adds one plan's distinct pages to the source list, naming the vendor once. */
function addSources(
	sources: CatalogSource[],
	seen: Set<string>,
	labelled: Set<string>,
	plan: string,
	catalog: PlanCatalog,
): void {
	for (const tier of catalog.tiers) {
		if (tier.source === null) continue
		const key = `${plan}\u0000${tier.source.url}`
		if (seen.has(key)) continue
		seen.add(key)
		const name = planName(plan)
		const label = labelled.has(name) ? `${name} ${tier.name}` : name
		labelled.add(name)
		sources.push({ name, label, url: tier.source.url, read: tier.source.read })
	}
}

/** Every distinct vendor page in the catalogue, one entry per page, in catalogue order. */
export function catalogSources(): CatalogSource[] {
	const seen = new Set<string>()
	const labelled = new Set<string>()
	const sources: CatalogSource[] = []
	for (const [plan, catalog] of Object.entries(TIER_CATALOG)) {
		if (catalog !== undefined) addSources(sources, seen, labelled, plan, catalog)
	}
	return sources
}
