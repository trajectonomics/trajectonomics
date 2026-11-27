import { WINDOW_PHRASE } from "./bar-words"
import type { CachePlanRow } from "./cache-rate"
import { compactCount } from "./format"
import { compactUsd, usdLabel } from "./money"
import type { PlanBar, PlanUnit } from "./plan-bars"
import { rankBy } from "./rank"
import type { PeakWindowKey } from "./types"
import type { ValuePoint } from "./value-points"

/**
 * The limits section's one label: the leading plan and its figure in the selected unit, for the
 * selected window. A rough estimate says so, and a dollar figure needs a meter.
 */
export function planTakeaway(
	bars: readonly PlanBar[],
	window: PeakWindowKey,
	unit: PlanUnit = "tokens",
): string {
	const leader = rankBy(bars, (bar) => bar.tokens)[0]
	if (leader === undefined || leader.tokens === null) {
		return unit === "usd" ? "No plan has an API $ figure yet." : "No plan has a full window yet."
	}
	const phrase = WINDOW_PHRASE[window]
	const rough = leader.rough ? " (rough)" : ""
	if (unit === "usd") {
		if (leader.kind !== "estimate") return `${leader.planName}: no API figure`
		return `${leader.planName}: ≈ ${compactUsd(leader.tokens)} API ${phrase} at 100%${rough}`
	}
	const withCache = unit === "processed" ? " with cache" : ""
	if (leader.kind === "estimate") {
		return `${leader.planName}: ≈ ${compactCount(leader.tokens)} ${phrase}${withCache} at 100%${rough}`
	}
	return `${leader.planName}: ${compactCount(leader.tokens)} ${phrase}${withCache}, most we used`
}

/** The value section's label: the plan with the most API value for each dollar. */
export function valueTakeaway(points: readonly ValuePoint[]): string {
	const leader = rankBy(points, (point) => point.x)[0]
	if (leader === undefined) return "No plan has both a weekly figure and a price yet."
	const lower = leader.hollow === true ? ", most we used" : ""
	return `${leader.label}: ${usdLabel(leader.x)} API value per $1${lower}`
}

/** The cache section's label: the plan that serves the largest share from cache. */
export function cacheTakeaway(rows: readonly CachePlanRow[]): string {
	const leader = rows.find((row) => row.rate !== null)
	if (leader === undefined || leader.rate === null) return "No plan reports a cache split yet."
	return `${leader.planName}: ${Math.round(leader.rate * 100)}% from cache`
}
