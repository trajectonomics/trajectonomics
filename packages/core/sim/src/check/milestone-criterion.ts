import { COMPARISONS, CRITERION_KINDS, MILESTONE_TERMS } from "../vocab"
import type { AccountIndex, Check } from "./codes"
import { metricCheck } from "./milestone-metric"
import { amount, boundedInt, date, oneOf, safeInt, str } from "./scalars"
import { checkShape, isRecord, req, type Shape } from "./shape"

const comparison = oneOf(COMPARISONS, "INVALID_COMPARISON")
const terms = oneOf(MILESTONE_TERMS, "INVALID_TERMS")

/** The fields a criterion of each kind carries; `kind` is already known to be one of CRITERION_KINDS. */
function shapeOf(kind: string, metric: Check): Shape {
	const common = { id: req(str), kind: req(oneOf(CRITERION_KINDS, "INVALID_KIND")) }
	if (kind === "date") return { ...common, on: req(date) }
	if (kind === "milestone") {
		return { ...common, milestone: req(str), months: req(safeInt) }
	}
	if (kind === "metric") {
		return {
			...common,
			metric: req(metric),
			op: req(comparison),
			amount: req(amount),
			terms: req(terms),
		}
	}
	return {
		...common,
		metric: req(metric),
		op: req(comparison),
		base: req(metric),
		num: req(boundedInt(1, Number.POSITIVE_INFINITY, "INVALID_MULTIPLE")),
		den: req(boundedInt(1, Number.POSITIVE_INFINITY, "INVALID_DENOMINATOR")),
		terms: req(terms),
	}
}

function isKind(value: unknown): value is string {
	return typeof value === "string" && CRITERION_KINDS.some((kind) => kind === value)
}

/** One criterion: its kind selects the fields it may carry, and an unknown kind is reported alone. */
export function criterionCheck(accounts: AccountIndex | undefined): Check {
	const metric = metricCheck(accounts)
	return (value, path, emit) => {
		const kind = isRecord(value) ? value["kind"] : undefined
		if (isKind(kind)) {
			checkShape(value, path, shapeOf(kind, metric), emit)
			return
		}
		if (!isRecord(value)) return emit("NOT_AN_OBJECT", path)
		const code = Object.hasOwn(value, "kind") ? "INVALID_KIND" : "MISSING_KEY"
		emit(code, [...path, "kind"])
	}
}
