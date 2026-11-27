import { WINDOW_PHRASE } from "./bar-words"
import type { CachePlanRow } from "./cache-rate"
import { compactCount } from "./format"
import { usdLabel } from "./money"
import type { PlanBar } from "./plan-bars"
import { rankBy } from "./rank"
import type { PeakWindowKey } from "./types"
import type { ValuePoint } from "./value-points"

/** The section's one sentence: which plan leads and by how much, for the selected window. */
export function planTakeaway(bars: readonly PlanBar[], window: PeakWindowKey): string {
	const leader = rankBy(bars, (bar) => bar.tokens)[0]
	if (leader === undefined || leader.tokens === null) return "No plan has a full window yet."
	const phrase = WINDOW_PHRASE[window]
	if (leader.kind === "estimate") {
		const rough = leader.rough ? " (rough)" : ""
		return `${leader.planName} gives the most tokens ${phrase}: ≈ ${compactCount(leader.tokens)} at 100%${rough}.`
	}
	return `${leader.planName} gives the most tokens ${phrase}: ${compactCount(leader.tokens)} most we used.`
}

/** The value section's sentence: the plan with the most API value for each dollar. */
export function valueTakeaway(points: readonly ValuePoint[]): string {
	const leader = rankBy(points, (point) => point.x)[0]
	if (leader === undefined) return "No plan has both a weekly figure and a price yet."
	return `${leader.label} gives the most API value per dollar: ${usdLabel(leader.x)} for every $1.`
}

/** The tokens section's sentence: the plan that serves the largest share from cache. */
export function cacheTakeaway(rows: readonly CachePlanRow[]): string {
	const leader = rows.find((row) => row.rate !== null)
	if (leader === undefined || leader.rate === null) return "No plan reports a cache split yet."
	return `${leader.planName} serves the most of its tokens from cache: ${Math.round(leader.rate * 100)}%.`
}
