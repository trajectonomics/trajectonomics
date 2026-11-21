/** Stable codes for every way a built page can name a release other than the Release snapshot's, or none. */
export type ReleaseFailureCode =
	| "RELEASE_VERSION_MISSING"
	| "RELEASE_VERSION_UNKNOWN"
	| "RELEASE_LINE_NOT_NAMED"
	| "RELEASE_DATE_TEXT_NOT_NAMED"
	| "RELEASE_DATE_MISMATCH"
