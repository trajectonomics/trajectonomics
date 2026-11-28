import type { PlanBar } from "./plan-bars"
import { MONTH_FROM_WEEK } from "./plan-month"

const WEEK_DAYS = 7
const MONTH_DAYS = 30

/** A weekly bar that has a figure; collecting and empty bars are left out. */
type BarFigure = PlanBar & {
	tokens: number
	kind: "estimate" | "fallback"
}

/** A weekly bar with a figure, and whether its plan's monthly allowance caps it. */
export type WeeklyFigure = BarFigure & {
	monthCapped: boolean
}

/** A 30-day figure scaled to one week: what a monthly allowance leaves for a week. */
function weekOfMonth(value: number): number {
	return (value * WEEK_DAYS) / MONTH_DAYS
}

/**
 * The week's figure, capped at the plan's monthly allowance per week, because a monthly allowance
 * can stop a plan before its weekly limit does. Only a stated 30-day estimate caps: a most-we-used
 * figure is a lower bound, and a plan whose 30-day figure is just the week × 30/7 has no monthly
 * window to bind.
 */
function cappedWeek(figure: BarFigure, month: PlanBar | undefined): WeeklyFigure {
	if (month === undefined || MONTH_FROM_WEEK.has(figure.plan)) {
		return { ...figure, monthCapped: false }
	}
	if (month.kind !== "estimate" || month.tokens === null) {
		return { ...figure, monthCapped: false }
	}
	const tokens = weekOfMonth(month.tokens)
	if (tokens >= figure.tokens) return { ...figure, monthCapped: false }
	return {
		...figure,
		tokens,
		low: month.low === null ? null : weekOfMonth(month.low),
		high: month.high === null ? null : weekOfMonth(month.high),
		kind: "estimate",
		monthCapped: true,
	}
}

/** The plans with a weekly figure, in the week bars' order, for the value and cache charts. */
export function weeklyFigures(week: readonly PlanBar[], month: readonly PlanBar[]): WeeklyFigure[] {
	const months = new Map(month.map((bar) => [bar.plan, bar]))
	return week
		.filter(
			(bar): bar is BarFigure =>
				bar.tokens !== null && (bar.kind === "estimate" || bar.kind === "fallback"),
		)
		.map((bar) => cappedWeek(bar, months.get(bar.plan)))
}
