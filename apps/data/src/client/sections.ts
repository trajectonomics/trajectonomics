export type SectionLink = { id: string; label: string }

/** The page's sections, in reading order; the nav and the observer share this list. */
export const SECTIONS: readonly SectionLink[] = Object.freeze([
	{ id: "plans", label: "Limits" },
	{ id: "value", label: "Value" },
	{ id: "tokens", label: "Cache" },
])
