/** A plan's notes as a card shows them: the first line, and the whole text when there is more. */
export interface NotesPreview {
	readonly first: string
	/** The whole text, or null when the first line is all of it. */
	readonly full: string | null
}

/** The preview of a plan's notes, or null when it has none. */
export function notesPreview(notes: string | null | undefined): NotesPreview | null {
	if (notes === null || notes === undefined || notes.trim() === "") return null
	const first = notes.split("\n")[0]?.trim() ?? ""
	return { first, full: notes.trim() === first ? null : notes }
}
