export type SectionLink = { id: string; label: string }

/** The page's sections, in reading order; the nav and the observer share this list. */
export const SECTIONS: readonly SectionLink[] = Object.freeze([
	{ id: "plans", label: "What each plan gives" },
	{ id: "value", label: "Value for money" },
	{ id: "tokens", label: "Where the tokens went" },
])
