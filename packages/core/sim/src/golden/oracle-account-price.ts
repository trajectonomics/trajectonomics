import type { Fixture } from "../fixtures/fixture"
import type { DateString, Flow } from "../types"
import { oracleFire, oracleWorth } from "./oracle-account-worth"
import type { OracleEvent } from "./oracle-flow"
import { type OracleFires, oracleLands } from "./oracle-milestone-walk"
import { oraclePlannedDay, type PlannedDay } from "./oracle-planned"
import { type OracleStates, oracleValuation } from "./oracle-state"

/** A `once` Flow with a Milestone start waits for it, and lands on the first day it is open. */
export function waiting(flow: Flow): boolean {
	return flow.frequency === "once" && flow.startAt !== undefined
}

/** The waiting Flows whose start has passed and whose Milestone has fired by `day`; they leave the list. */
function released(pending: Flow[], known: OracleFires, day: DateString): Flow[] {
	const open = pending.filter(
		(flow) => flow.start <= day && (known.get(flow.startAt!) ?? "~") <= day,
	)
	for (const flow of open) pending.splice(pending.indexOf(flow), 1)
	return open
}

export interface Day {
	readonly landing: readonly OracleEvent[]
	readonly planned: PlannedDay
}

/** What the Scenario's context holds for a walk: its states, fire dates and the Flows still waiting. */
export interface Context {
	readonly fixture: Fixture
	readonly states: OracleStates
	readonly known: OracleFires
	readonly pending: Flow[]
	readonly derivation: readonly Flow[]
}

/**
 * One day's landing and planned amounts, priced from the states before anything lands. A dynamic
 * Milestone is evaluated through the horizon only, and not once the walk has run out.
 */
export function priceDay(
	ctx: Context,
	day: DateString,
	due: readonly OracleEvent[],
	live: boolean,
): Day {
	const { fixture, states, known, pending, derivation } = ctx
	const { scenario, timeline } = fixture
	if (live && due.length > 0 && day <= timeline.horizon) {
		oracleFire(known, scenario.milestones ?? [], day, oracleWorth(states, day))
	}
	const landing = [
		...due.filter((event) => oracleLands(known, event.flow, day)),
		...released(pending, known, day).map((flow) => ({ date: day, flow, years: 0 })),
	]
	const read = (account: string): bigint => oracleValuation(states.get(account)!, day)
	return {
		landing,
		planned: oraclePlannedDay(landing, derivation, day, scenario.economy.inflation, read),
	}
}
