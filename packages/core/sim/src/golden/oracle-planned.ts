import type { Fixture } from "../fixtures/fixture"
import type { DateString, Derive, Flow } from "../types"
import { isDerived, isFixed, isRuled } from "../types"
import { oracleAccountAt } from "./oracle-account"
import { oracleCalendar } from "./oracle-calendar"
import { oracleDeriveValues } from "./oracle-derive"
import { type OracleEvent, oracleAmount, oracleEvents } from "./oracle-flow"
import { type OracleRuleLog, oracleRulePay } from "./oracle-rule"

/** The Flow ids a Derived amount reads, in Measure order, from the raw graph. */
function flowReferences(derive: Derive): readonly string[] {
	const ids: string[] = []
	for (const measure of derive.measures) if (measure.op === "flow") ids.push(measure.flow)
	return ids
}

/** Every Flow's planned gross amount on one Landed date, fixed sums and Derived values. */
export type PlannedDay = ReadonlyMap<string, bigint>

/** Derived Flows in dependency order, then Flow id, from a naive depth-first walk. */
export function oracleOrdered(flows: readonly Flow[]): readonly Flow[] {
	const byId = new Map<string, Flow>()
	for (const flow of flows) if (!byId.has(flow.id)) byId.set(flow.id, flow)
	const seen = new Set<string>()
	const out: Flow[] = []
	const visit = (flow: Flow): void => {
		if (!isDerived(flow) || seen.has(flow.id)) return
		seen.add(flow.id)
		for (const reference of flowReferences(flow.derive)) {
			const found = byId.get(reference)
			if (found !== undefined) visit(found)
		}
		out.push(flow)
	}
	for (const id of [...byId.keys()].sort()) visit(byId.get(id)!)
	return out
}

/** One Occurrence's planned amount when its Flow is fixed or ruled, else `undefined`. */
function oracleOccurrence(
	event: OracleEvent,
	at: { date: DateString; years: number; inflation: number },
	readAccount: (account: string) => bigint,
	rules: ReadonlyMap<string, OracleRuleLog>,
): bigint | undefined {
	const { flow } = event
	if (isFixed(flow)) return oracleAmount(event, at.inflation)
	const log = rules.get(flow.id)
	return isRuled(flow) && log !== undefined ? oracleRulePay(log, flow, at, readAccount) : undefined
}

/** The fixed and rule totals of one date, and how many Occurrences each Flow has on it. */
function oracleBaseTotals(
	events: readonly OracleEvent[],
	date: DateString,
	inflation: number,
	readAccount: (account: string) => bigint,
	rules: ReadonlyMap<string, OracleRuleLog>,
) {
	const totals = new Map<string, bigint>()
	const counts = new Map<string, number>()
	for (const event of events) {
		const id = event.flow.id
		counts.set(id, (counts.get(id) ?? 0) + 1)
		const at = { date, years: event.years, inflation }
		const amount = oracleOccurrence(event, at, readAccount, rules)
		if (amount !== undefined) totals.set(id, (totals.get(id) ?? 0n) + amount)
	}
	return { totals, counts }
}

export function oraclePlannedDay(
	events: readonly OracleEvent[],
	derivation: readonly Flow[],
	date: DateString,
	inflation: number,
	readAccount: (account: string) => bigint,
	rules: ReadonlyMap<string, OracleRuleLog> = new Map(),
): PlannedDay {
	const { totals, counts } = oracleBaseTotals(events, date, inflation, readAccount, rules)
	for (const flow of derivation) {
		const count = BigInt(counts.get(flow.id) ?? 0)
		if (count === 0n || !isDerived(flow)) continue
		const read = (id: string): bigint => totals.get(id) ?? 0n
		const value = oracleDeriveValues(flow.derive, read, date, inflation, readAccount)
		totals.set(flow.id, value * count)
	}
	return totals
}

/**
 * The independent planner: every Landed date's planned gross amounts, before Prepayment, through
 * `through`. The rule-of-thumb window can read planned expenses past the horizon (ADR 0013).
 */
export function oraclePlanned(
	fixture: Fixture,
	through: DateString = fixture.timeline.horizon,
): ReadonlyMap<DateString, PlannedDay> {
	const { scenario, timeline } = fixture
	const inflation = scenario.economy.inflation
	const calendar = oracleCalendar(fixture)
	const events = oracleEvents(scenario.flows, timeline.start, through, calendar)
	const derivation = oracleOrdered(scenario.flows)
	const byDate = new Map<DateString, OracleEvent[]>()
	for (const event of events) {
		const day = byDate.get(event.date) ?? []
		day.push(event)
		byDate.set(event.date, day)
	}
	const planned = new Map<DateString, PlannedDay>()
	for (const [date, day] of byDate) {
		const readAccount = (account: string) => oracleAccountAt(fixture, account, date)
		planned.set(date, oraclePlannedDay(day, derivation, date, inflation, readAccount))
	}
	return planned
}
