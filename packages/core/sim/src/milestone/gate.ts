import { addMonthsClamped } from "../calendar/arith"
import type { ResolvedCalendar } from "../calendar/business"
import type { AccountValues } from "../engine/account-values"
import type { DatedEvent } from "../engine/events"
import { compareIds } from "../engine/order"
import type { StateMap } from "../engine/state"
import type { DateString, Flow, MilestoneResult, Scenario, Timeline } from "../types"
import { onceEventsOn } from "./gate-once"
import { fireDynamic, type GateState, startState } from "./gate-state"
import { landsAt } from "./gating"

function byFlowId(left: DatedEvent, right: DatedEvent): number {
	return compareIds(left.flow.id, right.flow.id)
}

/**
 * The Milestone state of one run, or of one candidate stop of an FI scan: the fire dates so far,
 * the expenses landed, and which Flows land on a date (ADR 0012). Clones are independent.
 */
export class MilestoneGate {
	private readonly state: GateState

	private constructor(state: GateState) {
		this.state = state
	}

	/** The gate of a Scenario that declares Milestones, or `undefined`. `events` is the plan it reads. */
	static create(
		scenario: Scenario,
		timeline: Timeline,
		calendar: ResolvedCalendar | undefined,
		events: readonly DatedEvent[],
		values: AccountValues,
	): MilestoneGate | undefined {
		const state = startState(scenario, timeline, calendar, events, values)
		return state === undefined ? undefined : new MilestoneGate(state)
	}

	/**
	 * An independent copy whose expense windows read `events`, the plan of the candidate it serves.
	 * `stop` removes the deferred `once` Flows an FI candidate stops.
	 */
	clone(events: readonly DatedEvent[], stop?: (flow: Flow) => boolean): MilestoneGate {
		const { state } = this
		return new MilestoneGate({ ...state, events, stop, fires: new Map(state.fires) })
	}

	/**
	 * The events that land on `date`. Fires the dynamic Milestones due on `date` when it is an
	 * evaluation date (a Flow recurs or a Settlement falls there), gates the Flows, and adds the
	 * deferred `once` Flows whose Milestone fired on `date`.
	 */
	apply(
		states: StateMap,
		date: DateString,
		dayEvents: readonly DatedEvent[],
		settled: boolean,
	): readonly DatedEvent[] {
		const { state } = this
		const evaluated = settled || dayEvents.some((event) => event.deferred !== true)
		const fired = evaluated ? fireDynamic(state, states, date) : []
		const kept = dayEvents.filter((event) => landsAt(state.fires, event.flow, date))
		const landing = (flow: Flow): boolean => state.stop?.(flow) !== true
		const injected = onceEventsOn(
			state.deferred,
			fired,
			date,
			state.scenario.economy.inflation,
		).filter((event) => landing(event.flow) && landsAt(state.fires, event.flow, date))
		return injected.length === 0 ? kept : [...kept, ...injected].sort(byFlowId)
	}

	/** Records the expense a processed date landed, for the trailing window. */
	record(totals: { readonly date: DateString; readonly expense: bigint }): void {
		if (totals.expense === 0n) return
		const cutoff = addMonthsClamped(totals.date, -12)
		const entry = { date: totals.date, expense: totals.expense }
		this.state.trail = [...this.state.trail.filter((item) => item.date >= cutoff), entry]
	}

	/** The fire dates so far, static ones included: what a candidate's expense windows are gated by. */
	fires(): ReadonlyMap<string, DateString> {
		return this.state.fires
	}

	/** Each Milestone's fire date by the run's end, or `reached: false`, in Scenario order. */
	results(runEnd: DateString): readonly MilestoneResult[] {
		return this.state.plan.milestones.map((milestone): MilestoneResult => {
			const fire = this.state.fires.get(milestone.id)
			if (fire !== undefined && fire <= runEnd)
				return { id: milestone.id, reached: true, date: fire }
			return { id: milestone.id, reached: false }
		})
	}
}
