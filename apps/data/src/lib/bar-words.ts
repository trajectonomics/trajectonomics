import { displayCount } from "./format"
import type { PlanBar } from "./plan-bars"
import type { PeakWindowKey } from "./types"

/** How each window reads in a takeaway sentence. */
export const WINDOW_PHRASE: Readonly<Record<PeakWindowKey, string>> = Object.freeze({
	fiveHours: "in 5 hours",
	sevenDays: "a week",
	thirtyDays: "in 30 days",
})

/** The bar chart's one-line description, naming every plan's figure and how it was made. */
export function barAriaLabel(bars: readonly PlanBar[], window: PeakWindowKey): string {
	const parts = bars.map((bar) => {
		if (bar.tokens === null) {
			const waiting =
				bar.collecting === null
					? "no figure"
					: `${bar.collecting.seen} of ${bar.collecting.of} days seen`
			return `${bar.planName}: ${waiting}`
		}
		const kind = bar.kind === "estimate" ? "estimated at 100%" : "most we used"
		return `${bar.planName}: ${displayCount(bar.tokens)} tokens, ${kind}`
	})
	return `Bar chart of the tokens each plan gives ${WINDOW_PHRASE[window]}, largest first. ${parts.join("; ")}.`
}

/** The words the hidden table gives one bar's provenance. */
export function barKindWords(bar: PlanBar): string {
	if (bar.kind === "estimate") {
		const rough = bar.rough ? "Rough estimate" : "Estimated"
		const range =
			bar.high === null
				? `at least ${displayCount(bar.low ?? 0)}`
				: `between ${displayCount(bar.low ?? 0)} and ${displayCount(bar.high)}`
		return `${rough} at 100%, ${range}, from the usage meter`
	}
	if (bar.kind === "fallback") return "Most we used once the window was full, a lower bound"
	if (bar.kind === "collecting") return "Still collecting"
	return "No figure"
}

/** The exact figure a bar shows on hover, on focus, and to assistive technology. */
export function barTip(bar: PlanBar): string {
	if (bar.tokens === null) return `${bar.planName}. ${barKindWords(bar)}.`
	return `${bar.planName}: ${displayCount(bar.tokens)} tokens. ${barKindWords(bar)}.`
}
