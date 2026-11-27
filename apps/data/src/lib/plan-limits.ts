import type { CollectingWindow } from "./collecting"
import { compactCount, displayCount } from "./format"
import type { PeakColumn } from "./peak-words"
import type { Limit, PeakWindowKey } from "./types"

/** The words and bar one window shows when its meter estimate exists. */
export type LimitCell = {
	limit: Limit
	/** The main figure, e.g. "≈ 13.8M at 100%". */
	figure: string
	/** The range and the note under the figure, e.g. "13–15M · from the meter". */
	meta: string
	/** The most we used as a share of the estimated limit, capped at 100. */
	share: number
	/** The days seen while the window still fills, or null once it is full. */
	collecting: CollectingWindow | null
	/** The exact words a screen reader gets. */
	spoken: string
}

const LIMIT_NAME: Readonly<Record<PeakWindowKey, string>> = Object.freeze({
	fiveHours: "5-hour",
	sevenDays: "weekly",
	thirtyDays: "30-day",
})

const UNITS: readonly (readonly [number, string])[] = [
	[1_000_000_000_000, "T"],
	[1_000_000_000, "B"],
	[1_000_000, "M"],
	[1_000, "K"],
]

/** The largest unit a figure reaches, and its suffix; a figure below a thousand has none. */
function unitOf(value: number): { size: number; suffix: string } {
	for (const [size, suffix] of UNITS) {
		if (value >= size) return { size, suffix }
	}
	return { size: 1, suffix: "" }
}

/** A range between two token figures, in one unit when both reach it: "13–15M". */
export function limitRange(limit: Limit): string {
	if (limit.high === null) return `≥ ${compactCount(limit.low)}`
	const low = unitOf(limit.low)
	const high = unitOf(limit.high)
	if (low.size === high.size && high.size > 1) {
		return `${Math.round(limit.low / high.size)}–${Math.round(limit.high / high.size)}${high.suffix}`
	}
	return `${compactCount(limit.low)}–${compactCount(limit.high)}`
}

/** The most we used as a share of the estimated 100% limit; a figure above it fills the bar. */
export function limitShare(used: number | null, limit: Limit): number {
	if (used === null || limit.tokens <= 0) return 0
	return Math.min(100, Math.max(0, Math.round((used / limit.tokens) * 100)))
}

/** The words a screen reader gets for one limit cell. */
export function limitSpoken(limit: Limit, key: PeakWindowKey): string {
	const between =
		limit.high === null
			? `at least ${displayCount(limit.low)}`
			: `between ${displayCount(limit.low)} and ${displayCount(limit.high)}`
	const derived = limit.derived === true ? ", the week × 30/7" : ""
	const rough = limit.rough ? "Rough estimate: " : ""
	return `${rough}About ${displayCount(limit.tokens)} tokens at 100% of the ${LIMIT_NAME[key]} limit, ${between}${derived}, from ${limit.points} percentage points of meter readings`
}

/**
 * The cell for a window with a meter estimate, or null when it has none. The main figure is the
 * estimated 100%, the range comes from the readings' whole-percent rounding, and the bar shows
 * the most we used against that limit.
 */
export function limitCell(
	limit: Limit | null | undefined,
	column: PeakColumn,
	used: number | null,
	collecting: CollectingWindow | null,
): LimitCell | null {
	if (limit === null || limit === undefined) return null
	const notes = [limitRange(limit)]
	if (limit.derived === true) notes.push("week × 30/7")
	notes.push("from the meter")
	return {
		limit,
		figure: `≈ ${compactCount(limit.tokens)} at 100%`,
		meta: notes.join(" · "),
		share: limitShare(used, limit),
		collecting,
		spoken: limitSpoken(limit, column.key),
	}
}
