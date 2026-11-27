import { compactCount, displayCount } from "./format"
import { usdLabel } from "./money"
import type { PlanBar, PlanUnit } from "./plan-bars"
import type { PeakWindowKey } from "./types"

/** How each window reads in a takeaway sentence. */
export const WINDOW_PHRASE: Readonly<Record<PeakWindowKey, string>> = Object.freeze({
	fiveHours: "in 5 hours",
	sevenDays: "a week",
	thirtyDays: "in 30 days",
})

/** The hidden table's column header for one unit. */
export function unitHeading(unit: PlanUnit): string {
	if (unit === "usd") return "API $"
	return unit === "processed" ? "With cache" : "Tokens"
}

/** One figure in a unit's words, exact. */
export function unitValue(unit: PlanUnit, value: number): string {
	return unit === "usd" ? usdLabel(value) : displayCount(value)
}

/** One figure in a unit's words, compact for a label on the chart. */
export function unitFigure(unit: PlanUnit, value: number): string {
	return unit === "usd" ? usdLabel(value) : compactCount(value)
}

/** A bar's exact figure for the hidden table; a plan with no figure gets a dash. */
export function barValueText(bar: PlanBar): string {
	return bar.tokens === null ? "–" : unitValue(bar.unit, bar.tokens)
}

/** A bar's compact figure for its label on the chart; a plan with no figure gets a dash. */
export function barFigureText(bar: PlanBar): string {
	return bar.tokens === null ? "–" : unitFigure(bar.unit, bar.tokens)
}

/**
 * The bar chart's one-line description, naming the unit, every plan's figure and how it was made.
 */
export function barAriaLabel(bars: readonly PlanBar[], window: PeakWindowKey): string {
	const unit = bars[0]?.unit ?? "tokens"
	const parts = bars.map((bar) => {
		if (bar.tokens === null) {
			const waiting =
				bar.collecting === null
					? "no figure"
					: `${bar.collecting.seen} of ${bar.collecting.of} days seen`
			return `${bar.planName}: ${waiting}`
		}
		const kind = bar.kind === "estimate" ? "estimated at 100%" : "most we used"
		const figure =
			unit === "usd" ? `${usdLabel(bar.tokens)} of API value` : `${displayCount(bar.tokens)} tokens`
		return `${bar.planName}: ${figure}, ${kind}`
	})
	const chart =
		unit === "usd"
			? `Bar chart of the API dollar value each plan gives ${WINDOW_PHRASE[window]}`
			: unit === "processed"
				? `Bar chart of the tokens each plan gives ${WINDOW_PHRASE[window]}, cache reads counted in full`
				: `Bar chart of the tokens each plan gives ${WINDOW_PHRASE[window]}`
	return `${chart}, largest first. ${parts.join("; ")}.`
}

/** The words the hidden table gives one bar's provenance. */
export function barKindWords(bar: PlanBar): string {
	if (bar.kind === "estimate") {
		const rough = bar.rough ? "Rough estimate" : "Estimated"
		const between =
			bar.high === null
				? `at least ${unitValue(bar.unit, bar.low ?? 0)}`
				: `between ${unitValue(bar.unit, bar.low ?? 0)} and ${unitValue(bar.unit, bar.high)}`
		return `${rough} at 100%, ${between}, from the usage meter`
	}
	if (bar.kind === "fallback") return "Most we used once the window was full, a lower bound"
	if (bar.kind === "collecting") return "Still collecting"
	return "No figure"
}

/** The exact figure a bar shows on hover, on focus, and to assistive technology. */
export function barTip(bar: PlanBar): string {
	if (bar.tokens === null) return `${bar.planName}. ${barKindWords(bar)}.`
	const noun =
		bar.unit === "usd" ? "at API prices" : bar.unit === "processed" ? "tokens with cache" : "tokens"
	return `${bar.planName}: ${unitValue(bar.unit, bar.tokens)} ${noun}. ${barKindWords(bar)}.`
}
