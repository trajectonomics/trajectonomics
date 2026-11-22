/** The longest plan name the Dashboard sends. The CLI takes longer ones; a page has no use for them. */
export const MAX_PLAN_NAME = 100

function hasControlCharacter(name: string): boolean {
	for (const character of name) {
		const code = character.codePointAt(0) ?? 0
		if (code < 32 || code === 127) return true
	}
	return false
}

/**
 * Why a name cannot travel to `traj` as a plan name, or null when it can. `traj` has no `--` to end its
 * flags, so a name that starts with "-" would be read as a flag: `--help` prints help and writes
 * nothing. The server's Edit schema refuses the same names, so no page can send one.
 */
export function planNameShapeError(name: string): string | null {
	if (name.startsWith("-")) return "A plan name cannot start with -."
	if (hasControlCharacter(name))
		return "A plan name cannot hold a line break or a control character."
	if (name.length > MAX_PLAN_NAME) return `A plan name is at most ${MAX_PLAN_NAME} characters.`
	return null
}

/**
 * Why a name cannot name a copy of a plan, or null when it can. The CLI has the final word (a taken
 * name is its `scenario_name_taken`); this check only spares a person the round trip.
 */
export function planNameError(name: string, names: readonly string[]): string | null {
	const trimmed = name.trim()
	if (trimmed === "") return "Enter a name for the copy."
	const shape = planNameShapeError(trimmed)
	if (shape !== null) return shape
	if (names.includes(trimmed)) return `A plan named ${trimmed} already exists.`
	return null
}
