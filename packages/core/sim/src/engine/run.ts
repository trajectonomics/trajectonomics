import { resolvedCalendar } from "../calendar/resolve"
import { MilestoneGate } from "../milestone/gate"
import type { Baseline, DateString, Scenario, Timeline } from "../types"
import { collectDates } from "./dates"
import { buildEvents, flowsAt } from "./events"
import { finishLevies, planLevies } from "./levy-finish"
import { allSettlementDates, type LevySet } from "./levy-set"
import { type LiabilityLedger, openLedger } from "./liability-ledger"
import type { EngineResult } from "./result"
import { resolveReturns } from "./return-rows"
import type { Returns } from "./returns"
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

/** Attaches the liability ledger's paid-off dates, when the run tracks liabilities. */
function attachLedger(result: EngineResult, ledger: LiabilityLedger | undefined): EngineResult {
	if (!result.ok || ledger === undefined) return result
	return { ok: true, run: { ...result.run, paidOff: ledger.paidOff } }
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
	tracked = false,
): EngineResult {
	const states = createStates(baseline, scenario, timeline.start, resolveReturns(returns, timeline))
	const calendar = resolvedCalendar(scenario)
	const events = buildEvents(scenario, timeline, calendar)
	const levies = planLevies(scenario, timeline, calendar)
	const gate = MilestoneGate.create(scenario, timeline, calendar, events)
	const ledger = tracked ? openLedger(states, timeline.start) : undefined
	const acc: RunAccumulator = {
		snapshots: [],
		totals: [],
		wanted: new Set<DateString>(observations),
		levies,
		gate,
		ledger,
	}
	let index = 0
	const settlements = levies === undefined ? [] : allSettlementDates(levies, timeline.horizon)
	const dates = collectDates(events, observations, settlements)
	for (const date of dates) {
		const [next, dayEvents] = flowsAt(events, index, date)
		index = next
		const result = stepDate(acc, states, scenario, date, dayEvents)
		if (result !== undefined) {
			const end = endDate(result, timeline)
			return attachLedger(finish(result, states, levies, gate, end), ledger)
		}
	}
	const run = { snapshots: acc.snapshots, totals: acc.totals }
	return attachLedger(finish({ ok: true, run }, states, levies, gate, timeline.horizon), ledger)
}
