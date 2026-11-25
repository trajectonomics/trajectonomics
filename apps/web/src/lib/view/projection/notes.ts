/**
 * The HTML id of one note in a result's NoteList. The Scenario name scopes it, so two results on
 * one page (the FI page lists every Scenario) never share an id. The name is encoded as the hex of its
 * UTF-8 bytes, so names that differ only in punctuation ("a b" and "a-b") still get different ids.
 */
export function noteAnchor(scenario: string, index: number): string {
	return `note-${hexOf(scenario)}-${index}`
}

/** A string's UTF-8 bytes in lower-case hex, which is URL-safe and has no separators to collide with. */
function hexOf(text: string): string {
	let hex = ""
	for (const byte of new TextEncoder().encode(text)) hex += byte.toString(16).padStart(2, "0")
	return hex
}
