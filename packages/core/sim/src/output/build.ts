import type { EngineRun } from "../engine/result"
import type { Baseline, Scenario, Timeline } from "../types"
import type { Projection, ProjectionProblem } from "../types/projection"
import { buildCashflow } from "./cashflow"
import { declaredBy } from "./declared"
import { buildLevies } from "./levy"
import { buildLifetimes } from "./lifetime"
import { openingNetWorth } from "./opening"
import { buildPeriods } from "./periods"
import { buildRollups } from "./rollups"
import { rowDates } from "./row-dates"
import { buildRows } from "./rows"
import { accountRules } from "./rules"
import { buildUnfunded } from "./unfunded"

export type BuildResult =
	| { readonly projection: Projection }
	| { readonly problem: ProjectionProblem }

export function buildProjection(
	run: EngineRun,
	baseline: Baseline,
	scenario: Scenario,
	timeline: Timeline,
	breakdown = false,
): BuildResult {
	const rules = accountRules(scenario)
	const reported = new Set<string>(rowDates(timeline))
	const shown = run.snapshots.filter(
		(snapshot) => reported.has(snapshot.date) || snapshot.date === run.runsOut?.date,
	)
	const rows = buildRows(shown, timeline, rules, scenario.economy.inflation)
	if (rows.problem !== undefined) return { problem: rows.problem }
	const end = run.runsOut?.date ?? timeline.horizon
	const periods = buildPeriods(timeline.start, end, run.runsOut?.date)
	const declared = declaredBy(scenario)
	const rollups = buildRollups(run, periods, openingNetWorth(baseline, rules), declared)
	if (rollups.problem !== undefined) return { problem: rollups.problem }
	const unfunded = buildUnfunded(run.totals, end)
	if (unfunded.problem !== undefined) return { problem: unfunded.problem }
	const lifetimes = buildLifetimes(
		run.totals,
		periods,
		declared,
		scenario.accounts.map((account) => account.id),
	)
	if (lifetimes.problem !== undefined) return { problem: lifetimes.problem }
	const cashflow = buildCashflow(run, periods, scenario, breakdown)
	if (cashflow.problem !== undefined) return { problem: cashflow.problem }
	const levies = buildLevies(run.levies)
	if (levies.problem !== undefined) return { problem: levies.problem }
	const projection: Projection = {
		rows: rows.rows!,
		annual: rollups.annual!,
		unfundedContributions: unfunded.amounts!,
		...lifetimes.fields,
		...(run.runsOut === undefined
			? {}
			: { runsOut: { date: run.runsOut.date, unmet: Number(run.runsOut.unmet) } }),
		...(levies.levies === undefined ? {} : { levies: levies.levies }),
		...(run.milestones === undefined ? {} : { milestones: run.milestones }),
		...cashflow.fields,
	}
	return { projection }
}
