import type { DatedEvent } from "../engine/events"
import { closeReturnsOn, hasSettlement, type LevySet } from "../engine/levy-set"
import { type EngineRunsOut, processDate } from "../engine/occurrence"
import { isSafeInteger, overflow } from "../engine/overflow"
import type { StateMap } from "../engine/state"
import type { MilestoneGate } from "../milestone/gate"
import type { DateString, Scenario } from "../types"
import type { ProjectionProblem } from "../types/projection"

export interface PrefixAdvance {
	readonly problem?: ProjectionProblem
	readonly runsOut?: EngineRunsOut
}

/** Applies one date to the unchanged Scenario, as `runEngine` does: Returns, Milestones, then Flows. */
export function advance(
	states: StateMap,
	scenario: Scenario,
	date: DateString,
	dayEvents: readonly DatedEvent[],
	levies: LevySet | undefined,
	gate: MilestoneGate | undefined,
): PrefixAdvance {
	const settled = levies !== undefined && hasSettlement(levies, date)
	if (dayEvents.length === 0 && !settled) return {}
	if (levies !== undefined) closeReturnsOn(levies, states, date)
	const landing = gate === undefined ? dayEvents : gate.apply(states, date, dayEvents, settled)
	if (landing.length === 0 && !settled) return {}
	const outcome = processDate(states, scenario, date, landing, levies)
	gate?.record(outcome.totals)
	if (outcome.problem !== undefined) return { problem: outcome.problem }
	if (outcome.runsOut === undefined) return {}
	if (!isSafeInteger(outcome.runsOut.unmet)) return { problem: overflow(date) }
	return { runsOut: outcome.runsOut }
}
