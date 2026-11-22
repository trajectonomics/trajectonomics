import type { Fixture } from "../fixtures/fixture"
import type { DateString, Flow } from "../types"
import { oracleAddDays, oracleAddMonthsClamped } from "./oracle-date"
import {
	type OracleWalk,
	oracleAmount,
	oracleDues,
	oracleLands,
	oracleWalk,
} from "./oracle-milestone-walk"

export interface OracleMilestoneFi {
	readonly month: DateString
	/** The expense landing in the twelve months from `month`, on the candidate's own landings. */
	readonly annualExpenses: number
}

function candidateMonths(fixture: Fixture): DateString[] {
	const { start, horizon } = fixture.timeline
	const months: DateString[] = []
	let date = start.endsWith("-01") ? start : oracleAddMonthsClamped(`${start.slice(0, 7)}-01`, 1)
	for (; date <= horizon; date = oracleAddMonthsClamped(date, 1)) months.push(date)
	return months
}

/** The candidate's Scenario: earned income ends the day before `month`. */
function stopped(flows: readonly Flow[], month: DateString): Flow[] {
	return flows.map((flow) =>
		flow.kind === "income" && flow.earned ? { ...flow, end: oracleAddDays(month, -1) } : flow,
	)
}

interface Landing {
	readonly date: DateString
	readonly amount: number
}

/** The expense landings through `through`, gated by the fire dates the walk reached. */
function expenseLandings(flows: readonly Flow[], walk: OracleWalk, through: DateString): Landing[] {
	return flows.flatMap((flow) =>
		flow.kind !== "expense"
			? []
			: oracleDues(flow, through)
					.filter((date) => oracleLands(walk.fires, flow, date))
					.map((date) => ({ date, amount: oracleAmount(flow) })),
	)
}

function expenseFrom(landings: readonly Landing[], from: DateString): number {
	const until = oracleAddMonthsClamped(from, 12)
	return landings
		.filter((item) => item.date >= from && item.date < until)
		.reduce((sum, item) => sum + item.amount, 0)
}

/** The dates the walk checks the buffer on: its Due dates from `month`, `month` and the horizon. */
function bufferDates(flows: readonly Flow[], month: DateString, horizon: DateString): DateString[] {
	const dates = new Set<DateString>([month, horizon])
	for (const flow of flows) {
		for (const due of oracleDues(flow, horizon)) if (due >= month) dates.add(due)
	}
	return [...dates]
}

/**
 * Brute force for a plan with Milestones. For each candidate month it projects the Scenario with
 * earned income stopped there, and reads the Minimum buffer and the reference window from that
 * projection's own landings: expense landings through a year past the horizon, gated by the fire
 * dates the projection reached by the horizon. Survival is the cash never going below zero.
 */
export function oracleMilestoneFi(
	fixture: Fixture,
	minBufferMonths: number,
): OracleMilestoneFi | undefined {
	const { horizon } = fixture.timeline
	const through = oracleAddMonthsClamped(horizon, 12)
	for (const month of candidateMonths(fixture)) {
		const flows = stopped(fixture.scenario.flows, month)
		const walk = oracleWalk(fixture, flows)
		if (!walk.survived) continue
		const landings = expenseLandings(flows, walk, through)
		const enough = bufferDates(flows, month, horizon).every(
			(date) =>
				walk.after.get(date)! >= Math.ceil((minBufferMonths * expenseFrom(landings, date)) / 12),
		)
		if (enough) return { month, annualExpenses: expenseFrom(landings, month) }
	}
	return undefined
}
