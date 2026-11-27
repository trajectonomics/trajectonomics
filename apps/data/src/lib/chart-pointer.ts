import { CHART_WIDTH } from "./chart"
import { compactCount } from "./format"

const PLOT_LEFT = 64
const PLOT_RIGHT = 16

/** One line the day readout can name. */
export type ReadoutLine = {
	name: string
	points: readonly { day: string; tokens: number }[]
}

/** The day index under an x in the chart's coordinates, clamped to the series. */
export function dayAt(x: number, dayCount: number): number {
	if (dayCount <= 1) return 0
	const span = CHART_WIDTH - PLOT_LEFT - PLOT_RIGHT
	const index = Math.round(((x - PLOT_LEFT) / span) * (dayCount - 1))
	if (index < 0) return 0
	if (index > dayCount - 1) return dayCount - 1
	return index
}

/** The day an arrow key moves to, or null when the key does not move the probe. */
export function keyDay(key: string, current: number | null, dayCount: number): number | null {
	if (dayCount <= 0) return null
	const last = dayCount - 1
	if (key === "Home") return 0
	if (key === "End") return last
	if (key === "ArrowRight") return Math.min(last, (current ?? -1) + 1)
	if (key === "ArrowLeft") return Math.max(0, (current ?? last + 1) - 1)
	return null
}

/** The day under the probe, with each plan's compact total. Null when the index is outside. */
export function chartReadout(lines: readonly ReadoutLine[], dayIndex: number): string | null {
	const day = lines[0]?.points[dayIndex]
	if (day === undefined) return null
	const parts = lines.map((line) => {
		const tokens = line.points[dayIndex]?.tokens ?? 0
		return `${line.name} ${compactCount(tokens)}`
	})
	return `${day.day}: ${parts.join(" · ")}`
}
