import type { PlanBar } from "./plan-bars"
import { type TickKind, tickText } from "./tick-label"

export const BAR_WIDTH = 720
export const BAR_HEIGHT = 340

const PADDING = Object.freeze({ top: 44, right: 16, bottom: 12, left: 56 })
const PLOT_WIDTH = BAR_WIDTH - PADDING.left - PADDING.right
const PLOT_HEIGHT = BAR_HEIGHT - PADDING.top - PADDING.bottom
const MAX_RATIOS = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]

/** The smallest round maximum at or above a bar's largest figure, in the 1, 1.25, 1.5, 2 ... series. */
export function barMax(value: number): number {
	if (!(value > 0)) return 1
	const magnitude = 10 ** Math.floor(Math.log10(value))
	const normal = value / magnitude
	return (MAX_RATIOS.find((ratio) => normal <= ratio) ?? 10) * magnitude
}

/** One plan's bar: its marks in the chart's coordinates and the bar it was drawn from. */
export type BarMark = {
	bar: PlanBar
	x: number
	width: number
	center: number
	base: number
	y: number
	height: number
	valueY: number
	lowY: number | null
	highY: number | null
	openHigh: boolean
	/** The chart's top, where an open-ended whisker's arrow points. */
	openY: number
}

/** One axis tick: its value, where it sits, and its label in the bars' unit. */
export type BarTick = { value: number; y: number; label: string }

/** Everything the bar chart's SVG draws, computed without a browser. */
export type BarGeometry = {
	width: number
	height: number
	max: number
	bars: BarMark[]
	yTicks: BarTick[]
}

/** Places one bar per plan on a shared scale; a whisker uses the larger of its figures and range. */
export function barGeometry(bars: readonly PlanBar[]): BarGeometry | null {
	if (bars.length === 0) return null
	const top = PADDING.top
	const base = top + PLOT_HEIGHT
	const values = bars.map((bar) => Math.max(bar.tokens ?? 0, bar.high ?? 0))
	const max = barMax(Math.max(...values))
	const yFor = (value: number): number => base - (value / max) * PLOT_HEIGHT
	const slot = PLOT_WIDTH / bars.length
	const width = Math.min(72, slot * 0.56)
	const marks = bars.map((bar, index) => markOf(bar, index, slot, width, yFor, base))
	const tickKind: TickKind = bars[0]?.unit === "usd" ? "usd" : "tokens"
	const yTicks = Array.from({ length: 6 }, (_, index) => {
		const value = max - (max / 5) * index
		return { value, y: yFor(value), label: tickText(tickKind, value) }
	})
	return { width: BAR_WIDTH, height: BAR_HEIGHT, max, bars: marks, yTicks }
}

function markOf(
	bar: PlanBar,
	index: number,
	slot: number,
	width: number,
	yFor: (value: number) => number,
	base: number,
): BarMark {
	const tokensY = bar.tokens === null ? base : yFor(bar.tokens)
	const highY = bar.high === null ? null : yFor(bar.high)
	const topY = highY === null ? tokensY : Math.min(tokensY, highY)
	const x = PADDING.left + index * slot + (slot - width) / 2
	const y = bar.tokens === null ? base : Math.min(tokensY, base)
	return {
		bar,
		x,
		width,
		center: x + width / 2,
		base,
		y,
		height: base - y,
		valueY: bar.tokens === null ? base - 26 : Math.max(PADDING.top - 8, topY - 10),
		lowY: bar.low === null ? null : yFor(bar.low),
		highY,
		openHigh: bar.kind === "estimate" && bar.high === null,
		openY: PADDING.top,
	}
}
