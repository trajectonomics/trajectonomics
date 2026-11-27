import type { Limit, Measure, Peak } from "./types"

/** The measure a bar is drawn in: the peaks' tokens, tokens with cache reads, or list dollars. */
export type PlanUnit = "tokens" | "processed" | "usd"

/** The unit control's three choices, in reading order. */
export const PLAN_UNITS: readonly { unit: PlanUnit; label: string }[] = Object.freeze([
	{ unit: "tokens", label: "Tokens" },
	{ unit: "processed", label: "With cache" },
	{ unit: "usd", label: "API $" },
])

/** The estimate in one unit; null when the body has no figure in it. */
export function limitFigure(limit: Limit, unit: PlanUnit): Measure | null {
	if (unit === "usd") return limit.usd ?? null
	if (unit === "processed") return limit.processed ?? null
	return { value: limit.tokens, low: limit.low, high: limit.high }
}

/** A most-we-used figure in one unit; a dollar figure needs a meter, so it has none. */
export function peakFigure(peak: Peak, unit: PlanUnit): number | null {
	if (unit === "usd") return null
	return unit === "processed" ? peak.tokens + (peak.cacheRead ?? 0) : peak.tokens
}
