import type { PlanId } from "./plans"

/**
 * One tier a plan ran on for a run of UTC days. `from` and `to` are inclusive UTC days; a null
 * open end means "before our data" or "still active". The end goal is to read every tier from the
 * vendor's own API; `source` marks each entry that is still hand-kept until then.
 */
export type PlanTier = {
	/** Shown on the site, e.g. "Max". */
	name: string
	/** The first UTC day of the tier, or null when it began before our data. */
	from: string | null
	/** The last UTC day of the tier, or null while it is active. */
	to: string | null
	/** "vendor" when read from the vendor's own API, "hand-kept" until then. */
	source: "vendor" | "hand-kept"
	/** A short remark, shown only in Details or a tooltip. */
	note?: string
}

/**
 * The hand-kept tier history, one list per plan. An empty list is a plan whose tier we do not
 * know. A list holds no overlapping entries; a tier that ended and its successor never share a day.
 */
export const TIERS: Readonly<Record<PlanId, readonly PlanTier[]>> = Object.freeze({
	claude: [
		{
			name: "Pro",
			from: null,
			to: "2026-10-16",
			source: "hand-kept",
			note: "Before the Max subscription began on 2026-10-17",
		},
		{
			name: "Max",
			from: "2026-10-17",
			to: null,
			source: "vendor",
			note: "Read from Claude's profile endpoint",
		},
	],
	"opencode-go": [
		{
			name: "Go",
			from: null,
			to: null,
			source: "hand-kept",
			note: "Month by month, swapped with Command Code GOAT",
		},
	],
	"opencode-free": [{ name: "Free", from: null, to: null, source: "hand-kept" }],
	"command-code": [
		{
			name: "GOAT",
			from: null,
			to: null,
			source: "hand-kept",
			note: "Month by month, swapped with OpenCode Go",
		},
	],
	antigravity: [{ name: "Google AI Pro", from: null, to: null, source: "hand-kept" }],
	cursor: [
		{
			name: "Premium",
			from: null,
			to: null,
			source: "hand-kept",
			note: "Used mostly with Grok models",
		},
	],
	meta: [],
	mistral: [
		{
			name: "Pro",
			from: null,
			to: null,
			source: "hand-kept",
			note: "Cancelled; last used 2026-11-21",
		},
	],
	unknown: [],
})

/**
 * The tier of a dated tier history that covers a UTC day, with both ends inclusive and a null end
 * open. A day no tier covers answers null.
 */
export function tierRangeOn(tiers: readonly PlanTier[], day: string): PlanTier | null {
	return (
		tiers.find(
			(tier) => (tier.from === null || tier.from <= day) && (tier.to === null || tier.to >= day),
		) ?? null
	)
}

/** The tier a plan ran on that UTC day, from the hand-kept table; null when it is unknown. */
export function tierOn(plan: PlanId | string, day: string): PlanTier | null {
	const tiers = Object.hasOwn(TIERS, plan) ? TIERS[plan as PlanId] : undefined
	return tierRangeOn(tiers ?? [], day)
}
