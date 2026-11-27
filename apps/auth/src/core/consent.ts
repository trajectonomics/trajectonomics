/**
 * The marketing consent record. The history is append-only: every answer is a row, and the
 * latest row is the current state. Withdrawing is a new row plus a `withdrawnAt` on the row that
 * was true, so the record of what was given and taken away survives.
 *
 * Pure: records, inputs and "now" arrive as arguments. D1 and Better Auth stay outside.
 */

/** The wording the person agreed to. A wording change is a new version and a new record. */
export const CONSENT_WORDING_VERSION = "2026-11-27"

export const CONSENT_SOURCES = ["first-sign-in", "account"] as const
export type ConsentSource = (typeof CONSENT_SOURCES)[number]

/** One stored row, as the adapter returns it; dates may be `Date` or ISO text. */
export type StoredConsent = {
	readonly id: string
	readonly userId?: unknown
	readonly optedIn?: unknown
	readonly wordingVersion?: unknown
	readonly source?: unknown
	readonly givenAt?: unknown
	readonly withdrawnAt?: unknown
}

/** The current state a page renders: no rows means the person has not answered yet. */
export type ConsentView = {
	readonly optedIn: boolean
	readonly wordingVersion: string
	readonly source: ConsentSource
	readonly givenAt: string | null
	readonly withdrawnAt: string | null
}

/** The answer a POST carries, after validation. */
export type ConsentAnswer = {
	readonly optedIn: boolean
	readonly source: ConsentSource
}

/** The two ways an answer is rejected, one code per rule. */
export type ConsentAnswerError = "invalid_opted_in" | "invalid_source"

/** Whether a value names one of the sources the record accepts. */
export function isConsentSource(value: unknown): value is ConsentSource {
	return typeof value === "string" && (CONSENT_SOURCES as readonly string[]).includes(value)
}

/** Parses a POST body: `optedIn` must be a boolean and `source` one of the two names. */
export function parseConsentAnswer(
	body: unknown,
): { readonly answer: ConsentAnswer } | { readonly error: ConsentAnswerError } {
	if (typeof body !== "object" || body === null) return { error: "invalid_opted_in" }
	const record = body as Record<string, unknown>
	if (typeof record["optedIn"] !== "boolean") return { error: "invalid_opted_in" }
	if (!isConsentSource(record["source"])) return { error: "invalid_source" }
	return { answer: { optedIn: record["optedIn"], source: record["source"] } }
}

/** The latest row of a history given oldest first, which is what the store's ascending query returns. */
export function currentConsent(records: readonly StoredConsent[]): StoredConsent | null {
	return records.at(-1) ?? null
}

/**
 * The row a withdrawal closes, or null when there is nothing to withdraw: only a true row without
 * a withdrawal yet is closed, so turning email updates off twice appends without rewriting history.
 */
export function withdrawalTarget(latest: StoredConsent | null, optedIn: boolean): string | null {
	if (optedIn || latest === null || latest.optedIn !== true) return null
	if (latest.withdrawnAt !== null && latest.withdrawnAt !== undefined) return null
	return latest.id
}

/** One row as the page sees it, or null when its fields cannot be read. */
export function consentView(record: StoredConsent | null): ConsentView | null {
	if (record === null || typeof record.optedIn !== "boolean" || !isConsentSource(record.source)) {
		return null
	}
	return {
		optedIn: record.optedIn,
		wordingVersion:
			typeof record.wordingVersion === "string" ? record.wordingVersion : CONSENT_WORDING_VERSION,
		source: record.source,
		givenAt: isoOrNull(record.givenAt),
		withdrawnAt: isoOrNull(record.withdrawnAt),
	}
}

function isoOrNull(value: unknown): string | null {
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString()
	if (typeof value !== "string") return null
	const parsed = new Date(value)
	return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}
