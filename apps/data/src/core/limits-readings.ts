import { hourKey } from "./peaks-window"

/** One meter reading: a whole percent at the start of a UTC hour, and the period's reset. */
export type QuotaReading = {
	sampledAt: string
	usedPct: number
	resetsAt: string | null
}

const MINUTE_MS = 60_000

/** A reset time in the minute it falls in, so the API's jittery seconds compare equal. */
function resetMinute(value: string | null): number | null {
	if (value === null) return null
	const ms = Date.parse(value)
	return Number.isNaN(ms) ? null : Math.floor(ms / MINUTE_MS)
}

/** Whether a reading continues the previous one's reset period. */
function samePeriod(previous: QuotaReading, next: QuotaReading): boolean {
	if (next.usedPct < previous.usedPct) return false
	if (resetMinute(next.resetsAt) !== resetMinute(previous.resetsAt)) return false
	if (previous.resetsAt === null) return true
	return Date.parse(next.sampledAt) < Date.parse(previous.resetsAt)
}

/** One segment: consecutive readings that share a reset period, and how many readings it holds. */
export type Segment = {
	first: QuotaReading
	last: QuotaReading
	readings: number
}

/** Groups time-ordered readings into segments that share one reset period. */
export function segmentsOf(readings: readonly QuotaReading[]): Segment[] {
	const sorted = [...readings].sort(
		(left, right) => Date.parse(left.sampledAt) - Date.parse(right.sampledAt),
	)
	const segments: Segment[] = []
	let first: QuotaReading | null = null
	let previous: QuotaReading | null = null
	let count = 0
	for (const reading of sorted) {
		if (first === null || previous === null || !samePeriod(previous, reading)) {
			if (first !== null && previous !== null) {
				segments.push({ first, last: previous, readings: count })
			}
			first = reading
			count = 0
		}
		previous = reading
		count += 1
	}
	if (first !== null && previous !== null) segments.push({ first, last: previous, readings: count })
	return segments
}

/**
 * The uncached tokens used between two readings. A reading in slot H is taken at about H:01, so it
 * reflects use up to the end of H−1: hours from the first reading's slot up to but not including
 * the last reading's slot.
 */
export function tokensBetween(
	hourlyTokens: ReadonlyMap<number, number>,
	from: string,
	to: string,
): number {
	const start = hourKey(from)
	const end = hourKey(to)
	let tokens = 0
	for (let hour = start; hour < end; hour += 1) tokens += hourlyTokens.get(hour) ?? 0
	return tokens
}
