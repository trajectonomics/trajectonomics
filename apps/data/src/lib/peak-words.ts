import { cacheShare, cacheShareLabel } from "./cache-share"
import { displayCount } from "./format"
import type { Peak, PeakWindowKey } from "./types"

/** The three windows, in the order the table draws them. */
export type PeakColumnKey = PeakWindowKey

/** One column of the peaks table: its heading and the words a screen reader hears. */
export type PeakColumn = {
	key: PeakColumnKey
	/** The short heading above the column. */
	label: string
	/** The window in words, for a screen reader. */
	spoken: string
}

export const PEAK_COLUMNS: readonly PeakColumn[] = Object.freeze([
	{ key: "fiveHours", label: "5 hours", spoken: "5 hours" },
	{ key: "sevenDays", label: "Week", spoken: "7 days" },
	{ key: "thirtyDays", label: "30 days", spoken: "30 days" },
])

/** A peak's cache reads as a fraction of its tokens; null on a body cached before shape 3. */
export function peakCacheShare(peak: Peak): number | null {
	return cacheShare(peak.tokens, peak.cacheRead)
}

/**
 * The small note under a measured figure: a derived 30-day figure says how it was derived, and a
 * cache-heavy window says how much of its tokens were cache reads.
 */
export function peakNote(peak: Peak, key: PeakWindowKey): string | null {
	const notes: string[] = []
	if (peak.derived === true && key === "thirtyDays") notes.push("week × 30/7")
	const cache = cacheShareLabel(cacheShare(peak.tokens, peak.cacheRead))
	if (cache !== null) notes.push(cache)
	return notes.length === 0 ? null : notes.join(" · ")
}

/** The words a screen reader gets for one cell. */
export function peakSpoken(peak: Peak, column: PeakColumn): string {
	const start = peak.derived === true ? "the week × 30/7" : `from ${peak.fromDay}`
	const cache = cacheShareLabel(cacheShare(peak.tokens, peak.cacheRead))
	const extra = cache === null ? "" : `, ${cache}`
	return `${displayCount(peak.tokens)} tokens in ${column.spoken}, ${start}${extra}`
}
