import type { Fixture } from "../fixtures/fixture"
import type { DateString, Flow, Milestone } from "../types"
import { oracleAddDays, oracleAddMonthsClamped } from "./oracle-date"
import { holds, type Opening } from "./oracle-milestone-criteria"
import { assertLandsOnce, assertScope, openingBalances } from "./oracle-milestone-scope"

/** Milestone id to fire date. */
export type OracleFires = Map<string, DateString>

export interface OracleWalk {
	readonly survived: boolean
	readonly fires: OracleFires
	/** The accessible balance (cash plus idle Accounts) after each day's Flows, for every day walked. */
	readonly after: ReadonlyMap<DateString, number>
}

/**
 * The oracle for Milestone plans covers one cash Account (the single `withdraw` and surplus Account,
 * the only one a Flow touches and the only one survival reads), plus other asset Accounts at rate 0
 * that no Flow touches: unmarked ones stay idle and count in accessible and net worth, and ones
 * marked `liquid: false` count in net worth only. It takes zero inflation, no liability, lock, fee
 * or payout, no Reserve floor, monthly and `once` Flows with a fixed amount that does not grow, on a
 * day-of-month every month has, and Milestones made of `date`, `netWorth` and `accessibleNetWorth`
 * criteria. Anything else throws rather than being modelled: another frequency, a rate, inflation,
 * growth, or a `once` Flow whose `startAt` has not fired by its start (the engine defers that Flow
 * to its fire date).
 */
export function oracleAmount(flow: Flow): number {
	if (!("amount" in flow)) throw new Error("the oracle takes fixed amounts only")
	if (flow.growth !== "inflation" && flow.growth.bps !== 0) {
		throw new Error("the oracle takes Flows that do not grow only")
	}
	return flow.amount
}

/** A Flow's Due dates from its start through `last`, one a month, or just the start for `once`. */
export function oracleDues(flow: Flow, last: DateString): DateString[] {
	if (flow.frequency !== "monthly" && flow.frequency !== "once") {
		throw new Error("the oracle takes monthly and once Flows only")
	}
	const end = flow.end !== undefined && flow.end < last ? flow.end : last
	const dates: DateString[] = []
	for (let step = 0; ; step++) {
		const due = oracleAddMonthsClamped(flow.start, step)
		if (due > end) return dates
		dates.push(due)
		if (flow.frequency === "once") return dates
	}
}

/** A Milestone of dates only fires on a date known beforehand: its latest (`all`) or earliest (`any`). */
function staticFire(milestone: Milestone): DateString | undefined {
	if (milestone.criteria.some((criterion) => criterion.kind !== "date")) return undefined
	const dates = milestone.criteria.flatMap((c) => (c.kind === "date" ? [c.on] : [])).sort()
	return milestone.combine === "all" ? dates[dates.length - 1] : dates[0]
}

function fires(milestone: Milestone, date: DateString, opening: Opening): boolean {
	const results = milestone.criteria.map((criterion) => holds(criterion, date, opening))
	return milestone.combine === "all" ? results.every(Boolean) : results.some(Boolean)
}

/** Whether a Flow lands on `date` once the Milestones that gate it have the fire dates `known`. */
export function oracleLands(known: OracleFires, flow: Flow, date: DateString): boolean {
	const start = flow.startAt === undefined ? undefined : known.get(flow.startAt)
	const end = flow.endAt === undefined ? undefined : known.get(flow.endAt)
	if (flow.startAt !== undefined && (start === undefined || start > date)) return false
	return end === undefined || end > date
}

function duesByDate(flows: readonly Flow[], last: DateString): Map<DateString, Flow[]> {
	const dues = new Map<DateString, Flow[]>()
	for (const flow of flows) {
		for (const due of oracleDues(flow, last)) dues.set(due, [...(dues.get(due) ?? []), flow])
	}
	return dues
}

function startFires(milestones: readonly Milestone[]): OracleFires {
	const known: OracleFires = new Map()
	for (const milestone of milestones) {
		const date = staticFire(milestone)
		if (date !== undefined) known.set(milestone.id, date)
	}
	return known
}

/** One day of the walk: evaluate the Milestones on an evaluation day, then land the gated Flows. */
function oracleDay(
	known: OracleFires,
	milestones: readonly Milestone[],
	due: readonly Flow[],
	day: DateString,
	opening: number,
	held: { readonly idle: number; readonly marked: number },
): number {
	const accessible = opening + held.idle
	const balances = { accessible, net: accessible + held.marked }
	for (const milestone of due.length === 0 ? [] : milestones) {
		if (!known.has(milestone.id) && fires(milestone, day, balances)) known.set(milestone.id, day)
	}
	assertLandsOnce(known, due, day)
	let cash = opening
	for (const flow of due.filter((item) => oracleLands(known, item, day))) {
		cash += flow.kind === "income" ? oracleAmount(flow) : -oracleAmount(flow)
	}
	return cash
}

/** Walks `flows` day by day to the horizon; Milestones are evaluated on days a Flow falls due. */
export function oracleWalk(fixture: Fixture, flows: readonly Flow[]): OracleWalk {
	const { timeline, scenario } = fixture
	const milestones = scenario.milestones ?? []
	const known = startFires(milestones)
	const dues = duesByDate(flows, timeline.horizon)
	const after = new Map<DateString, number>()
	const { cash: opening, ...held } = openingBalances(fixture, assertScope(fixture))
	let cash = opening
	for (let day = timeline.start; day <= timeline.horizon; day = oracleAddDays(day, 1)) {
		cash = oracleDay(known, milestones, dues.get(day) ?? [], day, cash, held)
		if (cash < 0) return { survived: false, fires: known, after }
		after.set(day, cash + held.idle)
	}
	return { survived: true, fires: known, after }
}
