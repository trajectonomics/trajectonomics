import { hourKey } from "./peaks-window"

/** One meter reading: a whole percent at the start of a UTC hour, and the period's reset. */
export type QuotaReading = {
	sampledAt: string
	usedPct: number
	resetsAt: string | null
}

const MINUTE_MS = 60_000

/** A reset time in epoch milliseconds, or null when absent or unreadable. */
function resetMs(value: string | null): number | null {
	if (value === null) return null
	const ms = Date.parse(value)
	return Number.isNaN(ms) ? null : ms
}

/** Whether a reading continues the previous one's reset period. */
function samePeriod(previous: QuotaReading, next: QuotaReading): boolean {
	if (next.usedPct < previous.usedPct) return false
	const nextReset = resetMs(next.resetsAt)
	const previousReset = resetMs(previous.resetsAt)
	// The API jitters a reset by seconds, so two resets under a minute apart are the same reset.
	if (nextReset === null || previousReset === null) {
		if (nextReset !== previousReset) return false
	} else if (Math.abs(nextReset - previousReset) >= MINUTE_MS) {
		return false
	}
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
 * The hourly keys a segment covers. A reading in slot H is taken at about H:01, so it reflects use
 * up to the end of H−1: hours from the first reading's slot up to but not including the last's.
 */
export function hoursBetween(from: string, to: string): number[] {
	const start = hourKey(from)
	const end = hourKey(to)
	const hours: number[] = []
	for (let hour = start; hour < end; hour += 1) hours.push(hour)
	return hours
}
