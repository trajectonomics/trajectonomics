import { resolvedCalendar } from "../calendar/resolve"
import { MilestoneGate } from "../milestone/gate"
import type { Baseline, DateString, Scenario, Timeline } from "../types"
import { collectDates } from "./dates"
import { buildEvents, flowsAt } from "./events"
import { finishLevies, planLevies } from "./levy-finish"
import { allSettlementDates, type LevySet } from "./levy-set"
import { openOwedTracker } from "./owed-tracker"
import type { EngineResult } from "./result"
import { resolveReturns } from "./return-rows"
import type { Returns } from "./returns"
import { openRules } from "./rule-book"
import { attachRules, attachTracker } from "./run-attach"
import type { RunOptions } from "./run-options"
import { runScenarioOf } from "./run-scenario"
import { type RunAccumulator, stepDate } from "./run-step"
import { createStates, type StateMap } from "./state"

function attachLevies(
	result: EngineResult,
	states: StateMap,
	levies: LevySet | undefined,
	runEnd: DateString,
): EngineResult {
	if (!result.ok || levies === undefined) return result
	const finished = finishLevies(levies, states, runEnd)
	if (!finished.ok) return { ok: false, problem: finished.problem }
	return { ok: true, run: { ...result.run, levies: finished.levies } }
}

/** Attaches the Levy and Milestone reports of a finished run, reading both as of `runEnd`. */
function finish(
	result: EngineResult,
	states: StateMap,
	levies: LevySet | undefined,
	gate: MilestoneGate | undefined,
	runEnd: DateString,
): EngineResult {
	const withLevies = attachLevies(result, states, levies, runEnd)
	if (!withLevies.ok || gate === undefined) return withLevies
	return { ok: true, run: { ...withLevies.run, milestones: gate.results(runEnd) } }
}

function endDate(result: EngineResult, timeline: Timeline): DateString {
	if (!result.ok) return timeline.horizon
	return result.run.runsOut?.date ?? timeline.horizon
}

export function runEngine(
	baseline: Baseline,
	scenario: Scenario,
	timeline: Timeline,
	observations: readonly DateString[],
	returns?: Returns,
	options: RunOptions = {},
): EngineResult {
	const { tracked = false, breakdown = false, recordRules = false } = options
	const runScenario = runScenarioOf(scenario, returns)
	const states = createStates(
		baseline,
		runScenario,
		timeline.start,
		resolveReturns(returns, timeline),
	)
	const calendar = resolvedCalendar(runScenario)
	const events = buildEvents(runScenario, timeline, calendar)
	const levies = planLevies(runScenario, timeline, calendar)
	const gate = MilestoneGate.create(runScenario, timeline, calendar, events)
	const tracker = tracked ? openOwedTracker(states, timeline.start) : undefined
	const rules = openRules(runScenario, recordRules)
	const acc: RunAccumulator = {
		snapshots: [],
		totals: [],
		wanted: new Set<DateString>(observations),
		levies,
		gate,
		tracker,
		...(rules === undefined ? {} : { rules }),
		breakdown,
	}
	let index = 0
	const settlements = levies === undefined ? [] : allSettlementDates(levies, timeline.horizon)
	const dates = collectDates(events, observations, settlements)
	for (const date of dates) {
		const [next, dayEvents] = flowsAt(events, index, date)
		index = next
		const result = stepDate(acc, states, runScenario, date, dayEvents)
		if (result !== undefined) {
			const end = endDate(result, timeline)
			return attachRules(attachTracker(finish(result, states, levies, gate, end), tracker), rules)
		}
	}
	const run = { snapshots: acc.snapshots, totals: acc.totals }
	const finished = finish({ ok: true, run }, states, levies, gate, timeline.horizon)
	return attachRules(attachTracker(finished, tracker), rules)
}
