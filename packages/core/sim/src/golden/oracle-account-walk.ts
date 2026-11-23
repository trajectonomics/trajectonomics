import type { Fixture } from "../fixtures/fixture"
import type { DateString, Flow } from "../types"
import { oracleLandDay } from "./oracle-account-day"
import { oracleFire, oracleOpenStates, oracleWorth } from "./oracle-account-worth"
import { oracleCalendar } from "./oracle-calendar"
import { type OracleEvent, oracleEvents } from "./oracle-flow"
import { type OracleFires, oracleLands } from "./oracle-milestone-walk"
import { oracleOrdered, oraclePlannedDay } from "./oracle-planned"
import { oracleValuation } from "./oracle-state"

export interface Landing {
	readonly date: DateString
	readonly amount: bigint
}

export interface AccountWalk {
	/** No day through the horizon ran out of money. */
	readonly survived: boolean
	readonly fires: OracleFires
	/** The accessible net worth after each day's Flows. */
	readonly after: ReadonlyMap<DateString, bigint>
	/** The expense each day landed, through the end of the walk. */
	readonly expenses: readonly Landing[]
}

/** A `once` Flow with a Milestone start waits for it, and lands on the first day it is open. */
function waiting(flow: Flow): boolean {
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

/**
 * Walks the Scenario's flows through `through`, one event date at a time, pricing every Derived
 * amount from the walk's own states before that day's Flows land. Dynamic Milestones are evaluated
 * through the horizon only, so a Milestone not fired by then stays unfired in the year past it.
 */
export function oracleAccountWalk(
	fixture: Fixture,
	flows: readonly Flow[],
	through: DateString,
): AccountWalk {
	const { scenario, timeline } = fixture
	const milestones = scenario.milestones ?? []
	const states = oracleOpenStates(fixture)
	const known: OracleFires = new Map()
	const calendar = oracleCalendar(fixture)
	const events = oracleEvents(
		flows.filter((f) => !waiting(f)),
		timeline.start,
		through,
		calendar,
	)
	const pending = flows.filter(waiting)
	const derivation = oracleOrdered(flows)
	const dates = new Set([
		timeline.horizon,
		...events.map((e) => e.date),
		...pending.map((f) => f.start),
	])
	const after = new Map<DateString, bigint>()
	const expenses: Landing[] = []
	for (const day of [...dates].sort()) {
		const due = events.filter((event) => event.date === day)
		if (due.length > 0 && day <= timeline.horizon) {
			oracleFire(known, milestones, day, oracleWorth(states, day))
		}
		const landing: OracleEvent[] = [
			...due.filter((event) => oracleLands(known, event.flow, day)),
			...released(pending, known, day).map((flow) => ({ date: day, flow, years: 0 })),
		]
		const read = (account: string): bigint => oracleValuation(states.get(account)!, day)
		const planned = oraclePlannedDay(landing, derivation, day, scenario.economy.inflation, read)
		const landed = oracleLandDay(states, fixture, day, landing, planned)
		expenses.push({ date: day, amount: landed.expense })
		after.set(day, oracleWorth(states, day).accessible)
		if (landed.ranOut) return { survived: day > timeline.horizon, fires: known, after, expenses }
	}
	return { survived: true, fires: known, after, expenses }
}
