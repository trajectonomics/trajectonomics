import type { QueryError, QueryErrorCode } from "./errors"
import { isDateString, isKnownPlan } from "./rules"

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

type Check = { ok: true; value: string | null } | { ok: false; error: QueryError }

function invalid(code: QueryErrorCode, message: string): { ok: false; error: QueryError } {
	return { ok: false, error: { code, message } }
}

function checkDate(params: URLSearchParams, name: string): Check {
	const value = params.get(name)
	if (value !== null && !isDateString(value)) {
		return invalid("INVALID_DATE", `${name} must be a real YYYY-MM-DD date.`)
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
	if (value !== null && value.length === 0) {
		return invalid("INVALID_MODEL", "model must not be empty.")
	}
	return { ok: true, value }
}

function buildQuery(
	from: string | null,
	to: string | null,
	asOf: string | null,
	plan: string | null,
	model: string | null,
	nowMs: number,
	series: string,
): QueryResult {
	if (from !== null && to !== null && from > to) {
		return invalid("INVALID_RANGE", "from must not be after to.")
	}
	let upper = to
	if (asOf !== null) upper = upper === null || asOf < upper ? asOf : upper
	const today = new Date(nowMs).toISOString().slice(0, 10)
	return {
		ok: true,
		query: {
			filter: { series, from, to: upper, plan, model },
			asOf: asOf ?? to ?? today,
		},
	}
}

/** Validates the read API's query parameters against the plan table and the calendar. */
export function parseUsageQuery(url: URL, nowMs: number, series: string): QueryResult {
	const params = url.searchParams
	const from = checkDate(params, "from")
	if (!from.ok) return from
	const to = checkDate(params, "to")
	if (!to.ok) return to
	const asOf = checkDate(params, "asOf")
	if (!asOf.ok) return asOf
	const plan = checkPlan(params)
	if (!plan.ok) return plan
	const model = checkModel(params)
	if (!model.ok) return model
	return buildQuery(from.value, to.value, asOf.value, plan.value, model.value, nowMs, series)
}
