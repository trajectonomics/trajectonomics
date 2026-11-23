import type { ResolvedCalendar } from "../calendar/business"
import type { DatedEvent } from "../engine/events"
import type { StateMap } from "../engine/state"
import type { DateString, Flow, Scenario, Timeline } from "../types"
import { firesOn, type Reading } from "./criteria"
import type { TrailEntry } from "./expenses"
import { figuresOf, planViewOf } from "./gate-figures"
import { type DeferredOnce, deferredOnces, type MilestonePlan, planMilestones } from "./spec"

/** What a gate reads and writes: the fixed Scenario facts, then the fire dates and the trail. */
export interface GateState {
	readonly scenario: Scenario
	readonly timeline: Timeline
	readonly plan: MilestonePlan
	readonly deferred: readonly DeferredOnce[]
	readonly events: readonly DatedEvent[]
	/** An FI candidate's stop: a deferred `once` Flow it removes never lands. */
	readonly stop: ((flow: Flow) => boolean) | undefined
	/** Fires no dynamic Milestone: the walk past the horizon, where the Projection has ended. */
	readonly frozen?: boolean
	readonly fires: Map<string, DateString>
	trail: readonly TrailEntry[]
}

/** The starting state of a Scenario's Milestones, or `undefined` when it declares none. */
export function startState(
	scenario: Scenario,
	timeline: Timeline,
	calendar: ResolvedCalendar | undefined,
	events: readonly DatedEvent[],
): GateState | undefined {
	const plan = planMilestones(scenario, calendar)
	if (plan === undefined) return undefined
	const deferred = deferredOnces(scenario, plan, calendar)
	const fires = new Map(plan.fires)
	return { scenario, timeline, plan, deferred, events, stop: undefined, fires, trail: [] }
}

/** Fires, in dependency order, each dynamic Milestone whose criteria hold on `date`. */
export function fireDynamic(state: GateState, states: StateMap, date: DateString): string[] {
	const { scenario, timeline, events, fires, trail, plan } = state
	const view = planViewOf(scenario, timeline, events)
	const reading: Reading = { date, fires, figures: figuresOf(view, trail, fires, states, date) }
	const fired: string[] = []
	for (const milestone of plan.dynamic) {
		if (fires.has(milestone.id) || !firesOn(milestone, reading)) continue
		fires.set(milestone.id, date)
		fired.push(milestone.id)
	}
	return fired
}
