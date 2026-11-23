import type { ResolvedCalendar } from "../calendar/business"
import { type AccountValues, recordedValues } from "../engine/account-values"
import { collectDates } from "../engine/dates"
import { type DatedEvent, flowsAt } from "../engine/events"
import { planLevies } from "../engine/levy-finish"
import { allSettlementDates, type LevySet } from "../engine/levy-set"
import type { EngineRunsOut } from "../engine/occurrence"
import type { ResolvedReturns } from "../engine/returns"
import { createStates, type StateMap } from "../engine/state"
import { MilestoneGate } from "../milestone/gate"
import type { Baseline, DateString, Scenario, Timeline } from "../types"
import type { ProjectionProblem } from "../types/projection"
import { cloneLevySet, cloneStates } from "./clone"
import { advance } from "./prefix-advance"

export interface PrefixPoint {
	readonly states: StateMap
	readonly levies: LevySet | undefined
	/** The Milestone state before this date, present only when the Scenario declares Milestones. */
	readonly gate?: MilestoneGate
	/** The unchanged walk's Account values, present only when a Derived amount reads an Account. */
	readonly values?: AccountValues
}

export interface Prefix {
	readonly points: ReadonlyMap<DateString, PrefixPoint>
	readonly runsOut: EngineRunsOut | undefined
	readonly problem?: ProjectionProblem
	readonly stoppedAt?: DateString
}

export interface LevyPlan {
	readonly levies: LevySet | undefined
	readonly settlementDates: readonly DateString[]
}

/** The Levy tracker and settled dates for a timeline, sharing `runEngine`'s period plan. */
export function levyPlan(
	scenario: Scenario,
	timeline: Timeline,
	calendar: ResolvedCalendar | undefined,
): LevyPlan {
	const levies = planLevies(scenario, timeline, calendar)
	if (levies === undefined) return { levies, settlementDates: [] }
	return { levies, settlementDates: allSettlementDates(levies, timeline.horizon) }
}

/** The saved point before one candidate month: copies of the states, the Levy tallies and the gate. */
function pointOf(
	states: StateMap,
	levies: LevySet | undefined,
	gate: MilestoneGate | undefined,
	events: readonly DatedEvent[],
	values: AccountValues | undefined,
): PrefixPoint {
	return {
		states: cloneStates(states),
		levies: cloneLevySet(levies),
		...(gate && { gate: gate.clone(events) }),
		...(values && { values }),
	}
}

/** Walks the unmodified Scenario once, saving states and Levy tallies before each candidate month. */
export function baselinePrefix(
	baseline: Baseline,
	scenario: Scenario,
	timeline: Timeline,
	events: readonly DatedEvent[],
	candidates: readonly DateString[],
	calendar: ResolvedCalendar | undefined,
	series?: ResolvedReturns,
	reads: readonly string[] = [],
): Prefix {
	const states = createStates(baseline, scenario, timeline.start, series)
	const { levies, settlementDates } = levyPlan(scenario, timeline, calendar)
	const gate = MilestoneGate.create(scenario, timeline, calendar, events)
	const recorded = reads.length === 0 ? undefined : recordedValues(reads, states)
	const wanted = new Set(candidates)
	const points = new Map<DateString, PrefixPoint>()
	const dates = collectDates(events, candidates, settlementDates)
	let index = 0
	for (const date of dates) {
		if (wanted.has(date)) points.set(date, pointOf(states, levies, gate, events, recorded))
		recorded?.record(date, states)
		const [next, dayEvents] = flowsAt(events, index, date)
		index = next
		const stepped = advance(states, scenario, date, dayEvents, levies, gate)
		if (stepped.problem !== undefined) {
			return { points, runsOut: undefined, problem: stepped.problem, stoppedAt: date }
		}
		if (stepped.runsOut !== undefined) {
			return { points, runsOut: stepped.runsOut, stoppedAt: date }
		}
	}
	return { points, runsOut: undefined }
}
