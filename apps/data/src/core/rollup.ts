/** The UTC days a set of usage rows touches, sorted. */
export function affectedDays(usage: readonly { hourUtc: string }[]): string[] {
	const days = new Set<string>()
	for (const row of usage) days.add(row.hourUtc.slice(0, 10))
	return [...days].sort()
}
