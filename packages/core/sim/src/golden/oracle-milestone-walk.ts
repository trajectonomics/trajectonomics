import type { Fixture } from "../fixtures/fixture"
import type { DateString, Flow, Milestone } from "../types"
import { oracleMarkedIds } from "./oracle-access"
import { oracleAddDays, oracleAddMonthsClamped } from "./oracle-date"
import { holds, type Opening } from "./oracle-milestone-criteria"

/** Milestone id to fire date. */
export type OracleFires = Map<string, DateString>

export interface OracleWalk {
	readonly survived: boolean
	readonly fires: OracleFires
	/** The accessible cash left after each day's Flows, for every day of the walk. */
	readonly after: ReadonlyMap<DateString, number>
}

/**
 * The oracle for Milestone plans covers one liquid asset Account plus Accounts marked `liquid: false`
 * at rate 0 that no Flow touches, zero inflation, monthly and `once` Flows with a fixed amount on a
 * day-of-month every month has, and Milestones made of `date`, `netWorth` and `accessibleNetWorth`
 * criteria. Accessible net worth is then the cash, and net worth adds the marked balances.
 */
export function oracleAmount(flow: Flow): number {
	if (!("amount" in flow)) throw new Error("the oracle takes fixed amounts only")
	return flow.amount
}

/** A Flow's Due dates from its start through `last`, one a month, or just the start for `once`. */
export function oracleDues(flow: Flow, last: DateString): DateString[] {
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
	marked: number,
): number {
	const balances = { accessible: opening, net: opening + marked }
	for (const milestone of due.length === 0 ? [] : milestones) {
		if (!known.has(milestone.id) && fires(milestone, day, balances)) known.set(milestone.id, day)
	}
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
	const markedIds = oracleMarkedIds(scenario.accounts)
	let cash = 0
	let illiquid = 0
	for (const balance of fixture.baseline.balances) {
		if (markedIds.has(balance.account)) illiquid += balance.amount
		else cash += balance.amount
	}
	for (let day = timeline.start; day <= timeline.horizon; day = oracleAddDays(day, 1)) {
		cash = oracleDay(known, milestones, dues.get(day) ?? [], day, cash, illiquid)
		if (cash < 0) return { survived: false, fires: known, after }
		after.set(day, cash)
	}
	return { survived: true, fires: known, after }
}
