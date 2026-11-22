/** The Scenarios a projection page offers: the names that have a Read, in the Snapshot's order. */
export function projectionNames(projections: Readonly<Record<string, unknown>>): string[] {
	return Object.keys(projections)
}

/**
 * The Scenario a page shows: the requested name when it is one of the names, else the first one.
 * Null when there is no Scenario at all.
 */
export function chooseScenario(names: readonly string[], requested: string): string | null {
	return names.includes(requested) ? requested : (names[0] ?? null)
}
