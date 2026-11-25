import type { IngestBatch } from "./types"

/** The domain rules that can reject an ingest batch; one code per rule. */
export type IngestErrorCode =
	| "BODY_INVALID"
	| "EMPTY_BATCH"
	| "TOO_MANY_ROWS"
	| "ROW_INVALID"
	| "CONTRIBUTOR_MISMATCH"
	| "PLAN_UNKNOWN"
	| "MACHINE_ALIAS_INVALID"
	| "HOUR_NOT_ON_BOUNDARY"
	| "HOUR_IN_FUTURE"
	| "TOKEN_NEGATIVE"
	| "TOKEN_NOT_INTEGER"
	| "TOKEN_TOO_LARGE"
	| "TOKENS_TOTAL_INCONSISTENT"
	| "REQUESTS_INVALID"
	| "QUOTA_WINDOW_UNKNOWN"
	| "QUOTA_USED_PCT_RANGE"
	| "RESETS_AT_INVALID"

/** One rejected rule, carrying the caller's input path. */
export type IngestError = {
	path: string
	code: IngestErrorCode
	message: string
}

/** The result of validating an ingest body against the domain rules. */
export type IngestValidation =
	| { ok: true; batch: IngestBatch }
	| { ok: false; errors: IngestError[] }

/** A rule that can reject an API query. */
export type QueryErrorCode = "INVALID_DATE" | "INVALID_RANGE" | "PLAN_UNKNOWN" | "INVALID_MODEL"

/** One rejected query parameter. */
export type QueryError = {
	code: QueryErrorCode
	message: string
}
