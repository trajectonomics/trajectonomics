import type { Fixture } from "../fixtures/fixture"
import type { DateString, Flow } from "../types"
import { type AccountWalk, type Landing, oracleAccountWalk } from "./oracle-account-walk"
import { oracleAddDays, oracleAddMonthsClamped } from "./oracle-date"

export interface OracleAccountFi {
	readonly month: DateString
	/** The expense the candidate's own walk lands in the twelve months from `month`. */
	readonly annualExpenses: bigint
}

function candidateMonths(fixture: Fixture): DateString[] {
	const { start, horizon } = fixture.timeline
	const months: DateString[] = []
	let date = start.endsWith("-01") ? start : oracleAddMonthsClamped(`${start.slice(0, 7)}-01`, 1)
	for (; date <= horizon; date = oracleAddMonthsClamped(date, 1)) months.push(date)
	return months
}

/** The candidate's flows: earned income and the employer's share end the day before `month`. */
function stopped(flows: readonly Flow[], month: DateString): Flow[] {
	return flows.map((flow) => {
		const work =
			(flow.kind === "income" && flow.earned) ||
			(flow.kind === "contribution" && flow.funding === "employer")
		return work ? { ...flow, end: oracleAddDays(month, -1) } : flow
	})
}

function expenseFrom(landings: readonly Landing[], from: DateString): bigint {
	const until = oracleAddMonthsClamped(from, 12)
	let total = 0n
	for (const item of landings) if (item.date >= from && item.date < until) total += item.amount
	return total
}

/** Whether the accessible net worth covers the Minimum buffer on every day from `month` to the horizon. */
function buffered(
	walk: AccountWalk,
	month: DateString,
	horizon: DateString,
	months: bigint,
): boolean {
	for (const [date, accessible] of walk.after) {
		if (date < month || date > horizon) continue
		const required = (months * expenseFrom(walk.expenses, date) + 11n) / 12n
		if (accessible < required) return false
	}
	return true
}

/**
 * Brute force for a plan whose Derived amounts read Accounts. For each candidate month it walks the
 * Scenario with earned income stopped there, through a year past the horizon, and reads the Minimum
 * buffer and the reference expense from that walk's own landings. Nothing is priced from any other
 * walk: a candidate that stops changes what its Accounts hold, and so what its expenses cost.
 */
export function oracleAccountFi(
	fixture: Fixture,
	minBufferMonths: number,
): OracleAccountFi | undefined {
	const { horizon } = fixture.timeline
	const through = oracleAddMonthsClamped(horizon, 12)
	for (const month of candidateMonths(fixture)) {
		const walk = oracleAccountWalk(fixture, stopped(fixture.scenario.flows, month), through)
		if (!walk.survived) continue
		if (buffered(walk, month, horizon, BigInt(minBufferMonths))) {
			return { month, annualExpenses: expenseFrom(walk.expenses, month) }
		}
	}
	return undefined
}
