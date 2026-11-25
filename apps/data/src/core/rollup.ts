import { DAY_MS } from "./rules"

/** The UTC days a set of usage rows touches, sorted. */
export function affectedDays(usage: readonly { hourUtc: string }[]): string[] {
	const days = new Set<string>()
	for (const row of usage) days.add(row.hourUtc.slice(0, 10))
	return [...days].sort()
}

/**
 * The half-open `hourUtc` bounds of one UTC day, in the canonical timestamp form the ingest
 * stores: the day's start inclusive and the next day's start exclusive.
 */
export function dayBounds(day: string): { start: string; end: string } {
	const startMs = Date.parse(`${day}T00:00:00.000Z`)
	return {
		start: new Date(startMs).toISOString(),
		end: new Date(startMs + DAY_MS).toISOString(),
	}
}
