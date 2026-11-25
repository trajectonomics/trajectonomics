/** The most characters a plan's notes hold (cli ADR 0071), counted as Unicode characters. */
export const MAX_NOTES = 10_000

/** Whether the text holds a control character other than a newline or a tab, which `traj` refuses in notes. */
function hasControlCharacter(text: string): boolean {
	for (const character of text) {
		const code = character.codePointAt(0) ?? 0
		if (code === 10 || code === 9) continue
		if (code < 32 || code === 127) return true
	}
	return false
}

/** Why a text cannot be a plan's notes, or null when it can. An empty text is not an error: it clears the notes. */
export function notesError(text: string): string | null {
	if ([...text].length > MAX_NOTES) return `Notes are at most ${MAX_NOTES} characters.`
	if (hasControlCharacter(text)) return "Notes cannot hold a control character."
	return null
}

/**
 * The text the page sends for what a person typed: line endings as newlines, and no space around it, so a
 * field emptied of everything but spaces clears the notes.
 */
export function notesOf(typed: string): string {
	return typed.replaceAll("\r\n", "\n").replaceAll("\r", "\n").trim()
}
