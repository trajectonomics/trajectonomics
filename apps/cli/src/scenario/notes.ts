/** The most characters a plan's notes may hold (cli ADR-0071). */
export const NOTES_MAX_CHARACTERS = 10_000

/** A control character other than the newline and the tab, which notes may hold. */
const FORBIDDEN_CONTROL = /[^\P{Cc}\n\t]/u

/**
 * Notes as the person wrote them, without a leading byte order mark and with Windows line endings
 * read as newlines, so a file saved on any system stores the same text. A lone carriage return stays and is refused as a control
 * character.
 */
export function normalisedNotes(text: string): string {
	return text.replace(/^\uFEFF/, "").replaceAll("\r\n", "\n")
}

/**
 * Why `text` cannot be a plan's notes, or null when it can: plain UTF-8, at least one character
 * and at most 10,000 of them, with no control character but the newline and the tab.
 */
export function notesProblem(text: string): string | null {
	if (text === "") return "notes cannot be empty; clear the notes to remove them"
	if (!text.isWellFormed()) return "notes must be valid UTF-8 text"
	const length = Array.from(text).length
	if (length > NOTES_MAX_CHARACTERS) {
		return `notes are at most ${NOTES_MAX_CHARACTERS} characters; these are ${length}`
	}
	if (FORBIDDEN_CONTROL.test(text)) {
		return "notes cannot hold a control character other than a newline or a tab"
	}
	return null
}
