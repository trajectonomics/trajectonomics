import { addTo } from "./add"
import type { ContributionEntry } from "./contribution-entries"

/** What each employer Contribution Flow landed on a date, by Flow id; a zero amount has no line (ADR 0026). */
export function employerLines(entries: readonly ContributionEntry[]): Map<string, bigint> {
	const lines = new Map<string, bigint>()
	for (const entry of entries) {
		if (entry.employer && entry.amount !== 0n) addTo(lines, entry.flow, entry.amount)
	}
	return lines
}
