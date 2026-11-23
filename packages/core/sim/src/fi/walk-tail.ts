import { collectDates } from "../engine/dates"
import { flowsAt } from "../engine/events"
import { allSettlementDates } from "../engine/levy-set"
import { cloneLevySet, cloneRules, cloneStates } from "./clone"
import { recordReads } from "./read-dates"
import { processDay } from "./walk-day"
import type { DayInput, WalkInput } from "./walk-input"

/**
 * Continues a candidate's walk past the horizon through the windows' last date, on copies of its
 * states and Levy tallies, so its recorded Account values cover the year its next-12-months window
 * reads (ADR 0020). The buffer is not checked and no dynamic Milestone fires: the Projection ends at
 * the horizon, so a Milestone unfired there stays unfired. The walk stops quietly at a Shortfall or
 * a problem, and the values after it are read from the states this walk ended with: the tail's own,
 * not the horizon's, which the tail has moved on from.
 */
export function walkTail(input: WalkInput, walked: DayInput): void {
	const { events, horizon, through } = input.windows.tail
	if (events.length === 0) return
	const { point } = walked
	const levies = cloneLevySet(point.levies)
	const settlements = levies === undefined ? [] : allSettlementDates(levies, through)
	const further: DayInput = {
		...walked,
		point: {
			states: cloneStates(point.states),
			levies,
			...(point.rules && { rules: cloneRules(point.rules) }),
			...(point.gate && { gate: point.gate.frozen() }),
		},
		months: 0,
		table: undefined,
		trace: [],
	}
	walked.values?.endWith(further.point.states)
	const { sorted } = input.windows.readDates
	const { states } = further.point
	let read = sorted.findIndex((date) => date > horizon)
	if (read < 0) read = sorted.length
	let index = 0
	for (const date of collectDates(events, [], settlements)) {
		if (date <= horizon) continue
		read = recordReads(further.values, sorted, read, states, date)
		const [next, dayEvents] = flowsAt(events, index, date)
		index = next
		if (processDay(further, date, dayEvents).kind !== "ok") return
	}
	recordReads(further.values, sorted, read, states)
}
