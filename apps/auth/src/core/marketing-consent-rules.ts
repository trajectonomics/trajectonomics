/**
 * The marketing consent record. The history is append-only: every answer is a row, and the
 * latest row is the current state. Withdrawing is a new row plus a `withdrawnAt` on every row that
 * was true and still open, so the record of what was given and taken away survives.
 *
 * Every row also keeps the interface language the person saw and the wording version they agreed
 * to, so the sentence beside the account toggle is the one that was shown, not today's wording.
 *
 * Pure: records, inputs and "now" arrive as arguments. D1 and Better Auth stay outside.
 */

/** The wording the person agreed to. A wording change is a new version and a new record. */
export const CONSENT_WORDING_VERSION = "2026-11-27"

export const CONSENT_SOURCES = ["first-sign-in", "account"] as const
export type ConsentSource = (typeof CONSENT_SOURCES)[number]

/** The interface languages a person can answer in. */
export const CONSENT_LANGUAGES = ["en", "th"] as const
export type ConsentLanguage = (typeof CONSENT_LANGUAGES)[number]

/** One stored row, as the adapter returns it; dates may be `Date` or ISO text. */
export type StoredConsent = {
	readonly id: string
	readonly userId?: unknown
	readonly optedIn?: unknown
	readonly wordingVersion?: unknown
	readonly source?: unknown
	readonly language?: unknown
	readonly givenAt?: unknown
	readonly withdrawnAt?: unknown
}

/** The current state a page renders: no rows means the person has not answered yet. */
export type ConsentView = {
	readonly optedIn: boolean
	readonly wordingVersion: string
	readonly source: ConsentSource
	readonly language: ConsentLanguage
	readonly givenAt: string | null
	readonly withdrawnAt: string | null
}

/** The answer a POST carries, after validation. */
export type ConsentAnswer = {
	readonly optedIn: boolean
	readonly source: ConsentSource
	readonly language: ConsentLanguage
}

/** The three ways an answer is rejected, one code per rule. */
export type ConsentAnswerError = "invalid_opted_in" | "invalid_source" | "invalid_language"

/** Whether a value names one of the sources the record accepts. */
export function isConsentSource(value: unknown): value is ConsentSource {
	return typeof value === "string" && (CONSENT_SOURCES as readonly string[]).includes(value)
}

/** Whether a value names one of the languages the pages speak. */
export function isConsentLanguage(value: unknown): value is ConsentLanguage {
	return typeof value === "string" && (CONSENT_LANGUAGES as readonly string[]).includes(value)
}

/** Parses a POST body: `optedIn` a boolean, `source` one of two names, `language` one of two. */
export function parseConsentAnswer(
	body: unknown,
): { readonly answer: ConsentAnswer } | { readonly error: ConsentAnswerError } {
	if (typeof body !== "object" || body === null) return { error: "invalid_opted_in" }
	const record = body as Record<string, unknown>
	if (typeof record["optedIn"] !== "boolean") return { error: "invalid_opted_in" }
	if (!isConsentSource(record["source"])) return { error: "invalid_source" }
	if (!isConsentLanguage(record["language"])) return { error: "invalid_language" }
	return {
		answer: {
			optedIn: record["optedIn"],
			source: record["source"],
			language: record["language"],
		},
	}
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
		language: isConsentLanguage(record.language) ? record.language : "en",
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
