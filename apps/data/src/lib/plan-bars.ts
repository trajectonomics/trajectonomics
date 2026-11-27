import { peakCellChoice } from "./collecting"
import { MONTH_FROM_WEEK } from "./plan-month"
import { peakTableRows } from "./plan-peaks"
import { limitFigure, type PlanUnit, peakFigure } from "./plan-unit"
import { rankBy } from "./rank"
import type { Limit, PeakWindowKey, PlanPeak } from "./types"

export type { PlanUnit } from "./plan-unit"

/** How one bar's figure is made: an estimate, a lower bound, or no figure yet. */
export type PlanBarKind = "estimate" | "fallback" | "collecting" | "none"

/** One plan's bar in a peaks window, at the tier it runs on today, in the selected unit. */
export type PlanBar = {
	plan: string
	planName: string
	tier: string | null
	unit: PlanUnit
	kind: PlanBarKind
	tokens: number | null
	low: number | null
	high: number | null
	rough: boolean
	derived: boolean
	/** The days seen while a window still fills, or null once it is full. */
	collecting: { seen: number; of: number } | null
}

/** The choices the bars need: the day in view, each plan's first day, the window and the unit. */
export type BarOptions = {
	day: string
	planSince: Record<string, string>
	window: PeakWindowKey
	/** The measure to draw; tokens when absent. */
	unit?: PlanUnit
}

/** Every plan's bar for one window and unit, largest first; no figure sorts after the rest. */
export function planBars(plans: readonly PlanPeak[], options: BarOptions): PlanBar[] {
	const rows = peakTableRows([], plans, options.day)
	return rankBy(
		rows.map((row) => barOf(row, options)),
		(bar) => bar.tokens,
	)
}

/** The identity a bar shares with every unit, before its figure is chosen. */
type BarBase = { plan: string; planName: string; tier: string | null; unit: PlanUnit }

/** A bar with no figure in the selected unit: no draw, and a dash for a label. */
function noBar(base: BarBase): PlanBar {
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

/** The meter's estimate in one unit, or no bar when the body has no figure in it. */
function estimateBar(base: BarBase, limit: Limit, unit: PlanUnit): PlanBar {
	const figure = limitFigure(limit, unit)
	if (figure === null) return noBar(base)
	return {
		...base,
		kind: "estimate",
		tokens: figure.value,
		low: figure.low,
		high: figure.high,
		rough: limit.rough,
		derived: limit.derived === true,
		collecting: null,
	}
}

/** A window still filling: a flat stub and the days seen, never a figure. */
function collectingBar(base: BarBase, choice: { seen: number; of: number }): PlanBar {
	return {
		...noBar(base),
		kind: "collecting",
		collecting: { seen: choice.seen, of: choice.of },
	}
}

function barOf(row: ReturnType<typeof peakTableRows>[number], options: BarOptions): PlanBar {
	const unit = options.unit ?? "tokens"
	const peak = row[options.window]
	const limit = row.limits?.[options.window] ?? null
	const choice = peakCellChoice(
		options.window,
		peak !== null,
		options.planSince[row.plan],
		options.day,
		MONTH_FROM_WEEK.has(row.plan),
	)
	const base = { plan: row.plan, planName: row.planName, tier: row.tier?.name ?? null, unit }
	if (limit !== null) return estimateBar(base, limit, unit)
	// A dollar figure is an estimate or nothing: the most we used has no price behind it.
	if (unit === "usd") return noBar(base)
	if (choice.kind === "collecting") return collectingBar(base, choice)
	const used = peak === null ? null : peakFigure(peak, unit)
	if (peak === null || used === null) return noBar(base)
	return { ...noBar(base), kind: "fallback", tokens: used, derived: peak.derived === true }
}
