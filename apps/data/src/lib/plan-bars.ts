import { peakCellChoice } from "./collecting"
import { MONTH_FROM_WEEK } from "./plan-month"
import { peakTableRows } from "./plan-peaks"
import { rankBy } from "./rank"
import type { PeakWindowKey, PlanPeak } from "./types"

/** How one bar's figure is made: an estimate, a lower bound, or no figure yet. */
export type PlanBarKind = "estimate" | "fallback" | "collecting" | "none"

/** One plan's bar in a peaks window, at the tier it runs on today. */
export type PlanBar = {
	plan: string
	planName: string
	tier: string | null
	kind: PlanBarKind
	tokens: number | null
	low: number | null
	high: number | null
	rough: boolean
	derived: boolean
	/** The days seen while a window still fills, or null once it is full. */
	collecting: { seen: number; of: number } | null
}

/** The choices the bars need: the day in view, each plan's first day, and the window. */
export type BarOptions = {
	day: string
	planSince: Record<string, string>
	window: PeakWindowKey
}

/** Every plan's bar for one window, largest first; a plan with no figure sorts after the rest. */
export function planBars(plans: readonly PlanPeak[], options: BarOptions): PlanBar[] {
	const rows = peakTableRows([], plans, options.day)
	return rankBy(
		rows.map((row) => barOf(row, options)),
		(bar) => bar.tokens,
	)
}

function barOf(row: ReturnType<typeof peakTableRows>[number], options: BarOptions): PlanBar {
	const peak = row[options.window]
	const limit = row.limits?.[options.window] ?? null
	const choice = peakCellChoice(
		options.window,
		peak !== null,
		options.planSince[row.plan],
		options.day,
		MONTH_FROM_WEEK.has(row.plan),
	)
	const base = { plan: row.plan, planName: row.planName, tier: row.tier?.name ?? null }
	if (limit !== null) {
		return {
			...base,
			kind: "estimate",
			tokens: limit.tokens,
			low: limit.low,
			high: limit.high,
			rough: limit.rough,
			derived: limit.derived === true,
			collecting: null,
		}
	}
	if (choice.kind === "collecting") {
		return {
			...base,
			kind: "collecting",
			tokens: null,
			low: null,
			high: null,
			rough: false,
			derived: false,
			collecting: { seen: choice.seen, of: choice.of },
		}
	}
	if (peak !== null) {
		return {
			...base,
			kind: "fallback",
			tokens: peak.tokens,
			low: null,
			high: null,
			rough: false,
			derived: peak.derived === true,
			collecting: null,
		}
	}
	return {
		...base,
		kind: "none",
		tokens: null,
		low: null,
		high: null,
		rough: false,
		derived: false,
		collecting: null,
	}
}
