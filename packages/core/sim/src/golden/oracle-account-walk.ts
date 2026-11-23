import type { Fixture } from "../fixtures/fixture"
import type { DateString, Flow } from "../types"
import { isRuled } from "../types"
import { oracleLandDay, oraclePlannedExpense } from "./oracle-account-day"
import { type Context, priceDay, waiting } from "./oracle-account-price"
import { oracleOpenStates, oracleWorth } from "./oracle-account-worth"
import { oracleCalendar } from "./oracle-calendar"
import { oracleEvents } from "./oracle-flow"
import type { OracleFires } from "./oracle-milestone-walk"
import { oracleOrdered } from "./oracle-planned"
import { oracleRuleLog } from "./oracle-rule"

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

/**
 * Walks the Scenario's flows through `through`, one event date at a time, pricing every Derived
 * amount from the walk's own states before that day's Flows land. Dynamic Milestones are evaluated
 * through the horizon only, so a Milestone not fired by then stays unfired in the year past it.
 * A walk that runs out after the horizon stops landing but keeps pricing the planned amounts of
 * the days that follow, from the states it ended with, as the engine does (ADR 0013, ADR 0020).
 */
export function oracleAccountWalk(
	fixture: Fixture,
	flows: readonly Flow[],
	through: DateString,
): AccountWalk {
	const { timeline } = fixture
	const events = oracleEvents(
		flows.filter((f) => !waiting(f)),
		timeline.start,
		through,
		oracleCalendar(fixture),
	)
	const pending = flows.filter(waiting)
	const ctx: Context = {
		fixture,
		states: oracleOpenStates(fixture),
		known: new Map(),
		pending,
		derivation: oracleOrdered(flows),
		rules: new Map(flows.filter(isRuled).map((flow) => [flow.id, oracleRuleLog()])),
	}
	const dates = new Set([
		timeline.horizon,
		...events.map((e) => e.date),
		...pending.map((f) => f.start),
	])
	const after = new Map<DateString, bigint>()
	const expenses: Landing[] = []
	let ranOut = false
	for (const day of [...dates].sort()) {
		const due = events.filter((event) => event.date === day)
		const { landing, planned } = priceDay(ctx, day, due, !ranOut)
		if (ranOut) {
			expenses.push({ date: day, amount: oraclePlannedExpense(landing, planned) })
			continue
		}
		const landed = oracleLandDay(ctx.states, fixture, day, landing, planned)
		expenses.push({ date: day, amount: landed.expense })
		after.set(day, oracleWorth(ctx.states, day).accessible)
		if (landed.ranOut && day <= timeline.horizon) {
			return { survived: false, fires: ctx.known, after, expenses }
		}
		ranOut = landed.ranOut
	}
	return { survived: true, fires: ctx.known, after, expenses }
}
