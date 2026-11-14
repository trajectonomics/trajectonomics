/** Stable codes for every way the built Site can fail verification. One code per rule. */
export type BuildFailureCode =
	| "INDEX_PAGE_MISSING"
	| "NOT_FOUND_PAGE_MISSING"
	| "HEAD_NOT_SINGLE"
	| "BODY_NOT_SINGLE"
	| "NAV_NOT_SINGLE"
	| "MAIN_NOT_SINGLE"
	| "RESERVED_PRELOAD_PATH_BUILT"
	| "CONTENT_SECURITY_POLICY_PRESENT"
	| "EXTERNAL_RESOURCE_PRESENT"
	| "HEADER_MISSING"
	| "HERO_MISSING"
	| "FOOTER_MISSING"
	| "THEME_ATTRIBUTE_MISSING"
	| "THEME_ATTRIBUTE_NOT_PUBLISHED"
	| "THEME_FALLBACK_NOT_LIGHT"
	| "THEME_SCRIPT_MISSING"
	| "THEME_STYLESHEET_MISSING"
	| "THEME_SCRIPT_NOT_FIRST"
	| "THEME_CSS_NOT_BUILT"
	| "LANDMARK_COLOUR_NOT_WIRED"
	| "TEXT_CONTRAST_TOO_LOW"
	| "TEXT_COLOUR_UNRESOLVED"
	| "TEXT_COLOUR_UNREADABLE"

/** One failed build check: the rule's code, the file it concerns and a line a maintainer can act on. */
export interface BuildFailure {
	readonly code: BuildFailureCode
	readonly path: string
	readonly message: string
}

/** A frozen failure, so a caller cannot edit a check's verdict. */
export function buildFailure(code: BuildFailureCode, path: string, message: string): BuildFailure {
	return Object.freeze({ code, path, message })
}
