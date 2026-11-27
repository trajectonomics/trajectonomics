/** Usage relative to the plan's base tier, per window; null = the vendor states none. */
export type TierMultiplier = {
	fiveHours: number | null
	week: number | null
}

/** A dated public source: the page, the day it was read, and the sentence it states. */
export type TierSource = {
	url: string
	read: string
	quote: string
}

/** One tier with the multiplier its vendor states and the page that states it. */
export type CatalogTier = {
	name: string
	multiplier: TierMultiplier
	source: TierSource | null
}

/** One plan's catalogue: its base tier and every tier above it, in vendor order. */
export type PlanCatalog = {
	base: string
	tiers: readonly CatalogTier[]
}

/** The day every multiplier in this catalogue was read from its vendor's page. */
export const READ = "2026-11-27"

/** One catalogued tier, read on `READ` from the page whose sentence states its multiplier. */
export function tier(
	name: string,
	fiveHours: number | null,
	week: number | null,
	url: string,
	quote: string,
): CatalogTier {
	return { name, multiplier: { fiveHours, week }, source: { url, read: READ, quote } }
}
