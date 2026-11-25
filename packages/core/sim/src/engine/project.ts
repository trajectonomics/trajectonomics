import { check } from "../check"
import { buildEstate } from "../estate/build"
import { buildProjection } from "../output/build"
import { buildLiabilities } from "../output/liabilities"
import { periodEndDates } from "../output/periods"
import { rowDates } from "../output/row-dates"
import { statementMonths } from "../output/statement-months"
import { withPayouts } from "../payout/flows"
import type { Baseline, DateString, Scenario, Timeline } from "../types"
import type { ProjectionResult } from "../types/projection"
import type { ProjectionOptions } from "../types/statement"
import type { Returns } from "./returns"
import { withRules } from "./rule-statement"
import { runEngine } from "./run"

/** Report rows, the period ends the annual roll-ups close on, and the statement month ends. */
function observationDates(timeline: Timeline, statements: boolean): readonly DateString[] {
	const dates = [...rowDates(timeline), ...periodEndDates(timeline.start, timeline.horizon)]
	if (!statements) return dates
	return [
		...dates,
		...statementMonths(timeline.start, timeline.horizon, undefined).map((p) => p.to),
	]
}

/** Runs `check` first, then the deterministic engine; never throws on valid inputs. */
export function project(
	baseline: Baseline,
	declared: Scenario,
	timeline: Timeline,
	options: ProjectionOptions = {},
): ProjectionResult {
	const problems = check(baseline, declared, timeline)
	if (problems.length > 0) return { ok: false, problems }
	return projectChecked(baseline, declared, timeline, options)
}

/** The Projection of inputs `check` has accepted, grown by `returns` when given (one Market path). */
export function projectChecked(
	baseline: Baseline,
	declared: Scenario,
	timeline: Timeline,
	options: ProjectionOptions,
	returns?: Returns,
): ProjectionResult {
	const statements = options.liabilityStatements === true
	const scenario = withPayouts(declared)
	const observed = observationDates(timeline, statements)
	const breakdown = options.cashflowBreakdown === true
	const result = runEngine(baseline, scenario, timeline, observed, returns, {
		tracked: statements,
		breakdown,
	})
	if (!result.ok) return { ok: false, problems: [result.problem] }
	const output = buildProjection(
		result.run,
		baseline,
		scenario,
		timeline,
		breakdown,
		options.routing === true,
	)
	if ("problem" in output) return { ok: false, problems: [output.problem] }
	const withRule = withRules(
		output.projection,
		options.spendingRules === true,
		result.run.rules,
		scenario,
		timeline.start,
	)
	if ("problem" in withRule) return { ok: false, problems: [withRule.problem] }
	const ruled = withRule.projection
	const estate = options.estate === true ? buildEstate(ruled.rows, scenario, timeline) : undefined
	if (estate !== undefined && "problem" in estate) return { ok: false, problems: [estate.problem] }
	const reported = estate === undefined ? ruled : { ...ruled, estate: estate.statements }
	if (!statements) return { ok: true, projection: reported }
	const liabilities = buildLiabilities(result.run, baseline, scenario, timeline)
	if (liabilities.problem !== undefined) return { ok: false, problems: [liabilities.problem] }
	return { ok: true, projection: { ...reported, liabilities: liabilities.statements! } }
}
