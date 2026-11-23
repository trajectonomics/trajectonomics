import type { Fixture } from "../fixtures/fixture"
import type { DateString, Milestone } from "../types"
import { oracleLeftOut } from "./oracle-access"
import { holds } from "./oracle-milestone-criteria"
import type { OracleFires } from "./oracle-milestone-walk"
import type { OracleState, OracleStates } from "./oracle-state"
import { oracleValuation } from "./oracle-state"

/** Every declared Account at its opening balance, as a walk starts. */
export function oracleOpenStates(fixture: Fixture): OracleStates {
	const opening = new Map(fixture.baseline.balances.map((item) => [item.account, item.amount]))
	const states = new Map<string, OracleState>()
	for (const rule of fixture.scenario.accounts) {
		const balance = BigInt(opening.get(rule.id) ?? 0)
		states.set(rule.id, { rule, balance, asOf: fixture.timeline.start, accrued: 0n })
	}
	return states
}

export interface OracleWorth {
	readonly accessible: bigint
	readonly net: bigint
}

/** The accessible and the whole net worth of the states on `date`, before its Flows. */
export function oracleWorth(states: OracleStates, date: DateString): OracleWorth {
	let accessible = 0n
	let net = 0n
	for (const state of states.values()) {
		const value = oracleValuation(state, date)
		const signed = state.rule.kind === "liability" ? -value : value
		net += signed
		if (!oracleLeftOut(state.rule, date)) accessible += signed
	}
	return { accessible, net }
}

/** Fires each Milestone not yet fired whose criteria hold on `day` over the opening `worth`. */
export function oracleFire(
	known: OracleFires,
	milestones: readonly Milestone[],
	day: DateString,
	worth: OracleWorth,
): void {
	const opening = { accessible: Number(worth.accessible), net: Number(worth.net) }
	for (const milestone of milestones) {
		if (known.has(milestone.id)) continue
		const held = milestone.criteria.map((criterion) => holds(criterion, day, opening))
		const fires = milestone.combine === "all" ? held.every(Boolean) : held.some(Boolean)
		if (fires) known.set(milestone.id, day)
	}
}
