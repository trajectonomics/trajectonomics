import { addMonthsClamped } from "../calendar/arith"
import type {
	Comparison,
	Criterion,
	DateString,
	MetricCriterion,
	Milestone,
	MilestoneCriterion,
	MultipleCriterion,
} from "../types"
import { type Figures, metricValue } from "./metrics"

/** What a criterion is read against on one date: the fire dates so far and the figures. */
export interface Reading {
	readonly date: DateString
	readonly fires: ReadonlyMap<string, DateString>
	readonly figures: Figures
}

function compare(op: Comparison, left: bigint, right: bigint): boolean {
	return op === "atLeast" ? left >= right : left <= right
}

function milestoneHolds(criterion: MilestoneCriterion, reading: Reading): boolean {
	const fired = reading.fires.get(criterion.milestone)
	return fired !== undefined && reading.date >= addMonthsClamped(fired, criterion.months)
}

function metricHolds(criterion: MetricCriterion, reading: Reading): boolean {
	const value = metricValue(criterion.metric, reading.figures, criterion.terms)
	return value !== undefined && compare(criterion.op, value, BigInt(criterion.amount))
}

function multipleHolds(criterion: MultipleCriterion, reading: Reading): boolean {
	const value = metricValue(criterion.metric, reading.figures, criterion.terms)
	const base = metricValue(criterion.base, reading.figures, criterion.terms)
	if (value === undefined || base === undefined) return false
	const den = BigInt(criterion.den)
	const num = BigInt(criterion.num)
	return compare(criterion.op, value * den, base * num)
}

/** Whether one criterion holds on the reading's date. */
export function criterionHolds(criterion: Criterion, reading: Reading): boolean {
	if (criterion.kind === "date") return reading.date >= criterion.on
	if (criterion.kind === "milestone") return milestoneHolds(criterion, reading)
	if (criterion.kind === "metric") return metricHolds(criterion, reading)
	return multipleHolds(criterion, reading)
}

/** Whether a Milestone fires on the reading's date: its criteria combined with `all` or `any`. */
export function firesOn(milestone: Milestone, reading: Reading): boolean {
	const holds = (criterion: Criterion): boolean => criterionHolds(criterion, reading)
	return milestone.combine === "all"
		? milestone.criteria.every(holds)
		: milestone.criteria.some(holds)
}
