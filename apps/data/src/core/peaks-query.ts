import type { QueryError } from "./errors"
import { type Check, checkDate } from "./query"
import { nextDay } from "./rules"

/** A validated peaks query: the as-of day the response reports and reads up to. */
export type PeaksQuery = {
	asOf: string
}

/** The result of reading the peaks query parameters. */
export type PeaksResult = { ok: true; query: PeaksQuery } | { ok: false; error: QueryError }

/**
 * Validates the peaks endpoint's parameters. It reads one: `asOf`, the same day parameter and
 * bounds `/api/usage` takes, so an as-of view caps the peak windows the same way.
 */
export function parsePeaksQuery(url: URL, nowMs: number): PeaksResult {
	const today = new Date(nowMs).toISOString().slice(0, 10)
	const asOf: Check = checkDate(url.searchParams, "asOf", nextDay(today))
	if (!asOf.ok) return asOf
	return { ok: true, query: { asOf: asOf.value ?? today } }
}
