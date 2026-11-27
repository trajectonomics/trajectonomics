/** One section on the page: its id and how far its top sits below the viewport's top, in px. */
export type SectionTop = {
	id: string
	top: number
}

/**
 * The section being read: the last whose top has passed `reached` px under the viewport's top, or
 * the last section once the page is at its bottom, because a short last section never reaches the
 * top. Null when no section is on the page yet.
 */
export function currentSection(
	sections: readonly SectionTop[],
	atBottom: boolean,
	reached: number,
): string | null {
	const last = sections[sections.length - 1]
	if (last === undefined) return null
	if (atBottom) return last.id
	let current = sections[0]?.id ?? null
	for (const section of sections) {
		if (section.top <= reached) current = section.id
	}
	return current
}
