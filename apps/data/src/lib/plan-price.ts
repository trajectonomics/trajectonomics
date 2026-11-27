import { planPriceOn } from "@trajectonomics/data-collector/price-catalog"

/** The monthly USD price its vendor states for a plan's tier, or null when none is stated. */
export function monthlyPrice(plan: string, tier: string | null): number | null {
	const entry = planPriceOn(plan, tier)
	return entry?.usdMonth ?? null
}

/** A monthly price as a weekly one: twelve months over fifty-two weeks. */
export function weeklyPrice(usdMonth: number | null): number | null {
	if (usdMonth === null) return null
	return (usdMonth * 12) / 52
}

/** The weekly price of a plan's tier, or null when the catalogue prices neither. */
export function weeklyPriceOf(plan: string, tier: string | null): number | null {
	return weeklyPrice(monthlyPrice(plan, tier))
}
