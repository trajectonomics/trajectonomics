/**
 * Why a name cannot name a copy of a plan, or null when it can. The CLI has the final word (a taken
 * name is its `scenario_name_taken`); this check only spares a person the round trip.
 */
export function planNameError(name: string, names: readonly string[]): string | null {
	const trimmed = name.trim()
	if (trimmed === "") return "Enter a name for the copy."
	if (names.includes(trimmed)) return `A plan named ${trimmed} already exists.`
	return null
}
