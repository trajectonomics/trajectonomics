import type { QueryError, QueryErrorCode } from "./errors"
import {
	addDays,
	DAY_MS,
	DEFAULT_QUERY_SPAN_DAYS,
	isDateString,
	isKnownPlan,
	MAX_QUERY_SPAN_DAYS,
	MIN_QUERY_DAY,
	nextDay,
} from "./rules"

/** The filters the read API applies to rollups. */
export type UsageFilter = {
	series: string
	from: string | null
	to: string | null
	plan: string | null
	model: string | null
}

/** A validated usage query: filters plus the `asOf` the response reports. */
export type UsageQuery = {
	filter: UsageFilter
	asOf: string
}

/** The result of reading the usage query parameters. */
export type QueryResult = { ok: true; query: UsageQuery } | { ok: false; error: QueryError }

/** One validated query parameter: its value, or why it is not one. */
export type Check = { ok: true; value: string | null } | { ok: false; error: QueryError }

/** A model id as the collector names one: lowercase, 64 characters at most. */
const MODEL = /^[a-z0-9][a-z0-9.\-_/]{0,63}$/

function invalid(code: QueryErrorCode, message: string): { ok: false; error: QueryError } {
	return { ok: false, error: { code, message } }
}

/** Validates one YYYY-MM-DD parameter against the calendar and the query floor. */
export function checkDate(params: URLSearchParams, name: string, maxDay: string): Check {
	const value = params.get(name)
	if (value === null) return { ok: true, value }
	if (!isDateString(value)) {
		return invalid("INVALID_DATE", `${name} must be a real YYYY-MM-DD date.`)
	}
	if (value < MIN_QUERY_DAY || value > maxDay) {
		return invalid("INVALID_DATE", `${name} must be between ${MIN_QUERY_DAY} and ${maxDay}.`)
	}
	return { ok: true, value }
}

function checkPlan(params: URLSearchParams): Check {
	const value = params.get("plan")
	if (value !== null && !isKnownPlan(value)) return invalid("PLAN_UNKNOWN", "Unknown plan id.")
	return { ok: true, value }
}

function checkModel(params: URLSearchParams): Check {
	const value = params.get("model")
	if (value !== null && !MODEL.test(value)) {
		return invalid(
			"INVALID_MODEL",
			"model must be 1 to 64 lowercase characters from a-z, 0-9, dot, dash, underscore or slash.",
		)
	}
	return { ok: true, value }
}

function rangeCheck(from: string, upper: string): QueryResult | null {
	if (from > upper) return invalid("INVALID_RANGE", "from must not be after to.")
	const span = (Date.parse(`${upper}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / DAY_MS
	if (span > MAX_QUERY_SPAN_DAYS) {
		return invalid("INVALID_RANGE", `The range must span at most ${MAX_QUERY_SPAN_DAYS} days.`)
	}
	return null
}

/** Resolves the effective day window and the asOf the answer reports. */
function buildQuery(
	from: string | null,
	to: string | null,
	asOf: string | null,
	plan: string | null,
	model: string | null,
	nowMs: number,
	series: string,
): QueryResult {
	const today = new Date(nowMs).toISOString().slice(0, 10)
	const upper = asOf !== null && asOf < (to ?? today) ? asOf : (to ?? today)
	const lower = from ?? addDays(upper, -DEFAULT_QUERY_SPAN_DAYS)
	const range = rangeCheck(lower, upper)
	if (range !== null) return range
	return {
		ok: true,
		query: {
			filter: { series, from: lower, to: upper, plan, model },
			asOf: asOf ?? today,
		},
	}
}

/** Validates the read API's query parameters against the plan table and the calendar. */
export function parseUsageQuery(url: URL, nowMs: number, series: string): QueryResult {
	const params = url.searchParams
	const today = new Date(nowMs).toISOString().slice(0, 10)
	const maxDay = nextDay(today)
	const from = checkDate(params, "from", maxDay)
	if (!from.ok) return from
	const to = checkDate(params, "to", maxDay)
	if (!to.ok) return to
	const asOf = checkDate(params, "asOf", maxDay)
	if (!asOf.ok) return asOf
	const plan = checkPlan(params)
	if (!plan.ok) return plan
	const model = checkModel(params)
	if (!model.ok) return model
	return buildQuery(from.value, to.value, asOf.value, plan.value, model.value, nowMs, series)
}
