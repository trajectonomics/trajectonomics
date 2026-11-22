/** The Scenario the Tax page shows, and the name the address bar asked for when it is not one of them. */
export interface ResolvedScenario {
	readonly name: string | null
	/** The requested name when no Scenario has it; null when the request was empty or matched. */
	readonly unknown: string | null
}

/** Picks the requested Scenario among the names, or the first one when the request is empty or unknown. */
export function resolveScenario(names: readonly string[], requested: string): ResolvedScenario {
	const first = names[0] ?? null
	if (requested === "" || names.includes(requested)) {
		return { name: requested === "" ? first : requested, unknown: null }
	}
	return { name: first, unknown: requested }
}
