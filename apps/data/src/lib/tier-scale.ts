import type { CatalogTier, PlanCatalog } from "@trajectonomics/data-collector/tier-catalog"
import type { TierCell } from "./tier-cells"
import type { MeasuredTier, PeakWindowKey } from "./types"

/** The catalogued tier with this name, or null when the catalogue does not state one. */
export function catalogTier(catalog: PlanCatalog, name: string | null): CatalogTier | null {
	if (name === null) return null
	return catalog.tiers.find((tier) => tier.name === name) ?? null
}

/** The multiplier a vendor states for a window; 30 days use the weekly one. */
export function multiplierOf(tier: CatalogTier, key: PeakWindowKey): number | null {
	return key === "fiveHours" ? tier.multiplier.fiveHours : tier.multiplier.week
}

function sourceMultiplier(
	entry: MeasuredTier,
	catalog: PlanCatalog,
	key: PeakWindowKey,
): number | null {
	const tier = catalogTier(catalog, entry.tier)
	return tier === null ? null : multiplierOf(tier, key)
}

/**
 * The measured tier an estimate scales from: the plan's current tier when it states a multiplier
 * for the window, else the measured tier with the largest seven-day peak that does.
 */
export function sourceTier(
	current: string | null,
	measured: readonly MeasuredTier[],
	catalog: PlanCatalog,
	key: PeakWindowKey,
): MeasuredTier | null {
	const preferred = measured.find((entry) => entry.tier === current)
	if (preferred !== undefined && sourceMultiplier(preferred, catalog, key) !== null)
		return preferred
	let best: MeasuredTier | null = null
	for (const entry of measured) {
		if (sourceMultiplier(entry, catalog, key) === null) continue
		const tokens = entry.sevenDays?.tokens ?? -1
		if (best === null || tokens > (best.sevenDays?.tokens ?? -1)) best = entry
	}
	return best
}

/**
 * One estimated cell. A measured figure is a lower bound on that tier's limit, and the vendor
 * states limit(picked) = limit(from) × ratio, so measured × ratio is a lower bound on the picked
 * tier's limit. Both figures are "at least" figures, never a claim about the exact limit.
 */
export function estimateCell(
	picked: CatalogTier,
	current: string | null,
	measured: readonly MeasuredTier[],
	catalog: PlanCatalog,
	key: PeakWindowKey,
): TierCell {
	const ratio = multiplierOf(picked, key)
	if (ratio === null) return { kind: "not-stated" }
	const from = sourceTier(current, measured, catalog, key)
	if (from === null || from.tier === null) return { kind: "not-stated" }
	const fromRatio = sourceMultiplier(from, catalog, key)
	if (fromRatio === null) return { kind: "not-stated" }
	const peak = from[key]
	if (peak === null) return { kind: "not-measured" }
	const factor = ratio / fromRatio
	return {
		kind: "estimated",
		tokens: Math.floor(peak.tokens * factor),
		factor,
		fromTier: from.tier,
	}
}

/** A measured tier's three cells, with a null peak kept as "not reported" in its window. */
export function measuredCells(entry: MeasuredTier): Record<PeakWindowKey, TierCell> {
	return {
		fiveHours: { kind: "measured", peak: entry.fiveHours },
		sevenDays: { kind: "measured", peak: entry.sevenDays },
		thirtyDays: { kind: "measured", peak: entry.thirtyDays },
	}
}
