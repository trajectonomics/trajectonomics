/** How an axis spreads its values: evenly, or by orders of magnitude. */
export type ScaleKind = "linear" | "log"

/** One tick on an axis: its value and where it sits from the axis's start, 0 to 1. */
export type AxisTick = { value: number; share: number }

/** One axis: its scale, its bounds, and the ticks a chart labels. */
export type Axis = {
	kind: ScaleKind
	min: number
	max: number
	ticks: readonly AxisTick[]
}

const STEP_RATIOS = [1, 2, 2.5, 5, 10]

/** The smallest step in the 1, 2, 2.5, 5, 10 series at or above a rough step. */
export function niceStep(rough: number): number {
	if (!(rough > 0)) return 1
	const magnitude = 10 ** Math.floor(Math.log10(rough))
	const normal = rough / magnitude
	const ratio = STEP_RATIOS.find((value) => normal <= value) ?? 10
	return ratio * magnitude
}

function linearAxis(min: number, max: number): Axis {
	const step = niceStep((max - min) / 4)
	const count = Math.max(1, Math.ceil((max - min) / step))
	const ticks = Array.from({ length: count + 1 }, (_, index) => ({
		value: min + index * step,
		share: index / count,
	}))
	return { kind: "linear", min, max: min + count * step, ticks }
}

function logAxis(min: number, max: number): Axis {
	const from = 10 ** Math.floor(Math.log10(min))
	const to = 10 ** Math.ceil(Math.log10(max))
	const count = Math.max(1, Math.round(Math.log10(to / from)))
	const ticks = Array.from({ length: count + 1 }, (_, index) => ({
		value: Number((from * 10 ** index).toPrecision(12)),
		share: index / count,
	}))
	return { kind: "log", min: from, max: from * 10 ** count, ticks }
}

/**
 * The axis for a set of values. A fixed domain always draws evenly; otherwise a span wider than
 * ten times draws on a log scale, because the small values would otherwise collapse to one line.
 */
export function axisFor(values: readonly number[], fixed?: readonly [number, number]): Axis | null {
	if (values.length === 0) return null
	if (fixed !== undefined) return fixed[1] > fixed[0] ? linearAxis(fixed[0], fixed[1]) : null
	const low = Math.min(...values)
	const high = Math.max(...values)
	if (!Number.isFinite(low) || !Number.isFinite(high)) return null
	if (low > 0 && high / low > 10) return logAxis(low, high)
	return linearAxis(Math.min(0, low), Math.max(high, Math.min(0, low) + 1))
}

/** Where a value sits on an axis, 0 at its start and 1 at its end. */
export function axisShare(axis: Axis, value: number): number {
	const share =
		axis.kind === "log"
			? (Math.log(value) - Math.log(axis.min)) / (Math.log(axis.max) - Math.log(axis.min))
			: (value - axis.min) / (axis.max - axis.min)
	return Number.isFinite(share) ? Math.min(1, Math.max(0, share)) : 0
}
