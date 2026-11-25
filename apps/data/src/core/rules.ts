import { plans } from "@trajectonomics/data-collector/plans"
import type { Granularity } from "@trajectonomics/data-collector/types"

/** One hour and one day in milliseconds. */
export const HOUR_MS = 3_600_000
export const DAY_MS = 86_400_000
/** The earliest instant an ingest row may describe: 2020-01-01T00:00:00Z. */
export const MIN_INGEST_MS = Date.parse("2020-01-01T00:00:00.000Z")
/** The largest token or request count a row may carry. */
export const MAX_TOKENS = 100_000_000_000
/** The most rows one ingest body may carry. */
export const MAX_INGEST_ROWS = 5_000
/** The largest ingest body, in bytes. */
export const MAX_INGEST_BYTES = 1_048_576
/** How many validation errors a 400 response lists. */
export const MAX_INGEST_ERRORS = 10
/** The earliest UTC day the public query may name. */
export const MIN_QUERY_DAY = "2020-01-01"
/** The longest span, in days, the public query may ask for. */
export const MAX_QUERY_SPAN_DAYS = 400

const PLAN_IDS = new Set<string>(plans.map((plan) => plan.id))
const MACHINE_ALIAS = /^m-[0-9a-f]{8}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Whether the plan id exists in the collector's plan table. */
export function isKnownPlan(value: string): boolean {
	return PLAN_IDS.has(value)
}

/** Whether the value is a collector machine alias, never a raw hostname. */
export function isMachineAlias(value: string): boolean {
	return MACHINE_ALIAS.test(value)
}

/** Whether the value is a real UTC calendar day in `YYYY-MM-DD` form. */
export function isDateString(value: string): boolean {
	if (!DATE.test(value)) return false
	const ms = Date.parse(`${value}T00:00:00.000Z`)
	return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === value
}

/** The epoch milliseconds of a UTC bucket start, or null when the value is not one. */
export function boundaryMs(value: string, granularity: Granularity): number | null {
	const ms = Date.parse(value)
	if (Number.isNaN(ms)) return null
	const width = granularity === "day" ? 24 * HOUR_MS : HOUR_MS
	return ms % width === 0 ? ms : null
}

/** Whether a bucket starts more than one hour after now. */
export function isMoreThanOneHourAhead(ms: number, nowMs: number): boolean {
	return ms > nowMs + HOUR_MS
}

/** Whether a bucket starts before the ingest floor of 2020-01-01T00:00:00Z. */
export function isBeforeIngestFloor(ms: number): boolean {
	return ms < MIN_INGEST_MS
}

/** The UTC day one day after a `YYYY-MM-DD` day. */
export function nextDay(day: string): string {
	return new Date(Date.parse(`${day}T00:00:00.000Z`) + DAY_MS).toISOString().slice(0, 10)
}
