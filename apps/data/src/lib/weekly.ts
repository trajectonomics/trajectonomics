import type { PlanBar } from "./plan-bars"

/** A weekly bar that has a figure; collecting and empty bars are left out. */
export type WeeklyFigure = PlanBar & {
	tokens: number
	kind: "estimate" | "fallback"
}

/** The plans with a weekly figure, in the bars' order, for the value and cache charts. */
export function weeklyFigures(bars: readonly PlanBar[]): WeeklyFigure[] {
	return bars.filter(
		(bar): bar is WeeklyFigure =>
			bar.tokens !== null && (bar.kind === "estimate" || bar.kind === "fallback"),
	)
}
