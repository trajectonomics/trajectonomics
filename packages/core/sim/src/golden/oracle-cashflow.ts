/**
 * Independent oracle for the cash-flow breakdown. It walks every calendar day in exact integers, in
 * the engine's order of operations, and sums what each Flow, Levy and Account lands. It imports
 * nothing from the engine. Prepayment is the plain basis-point share of each income, so it covers
 * Scenarios without capped shares, and it models no Settlement.
 */
import type { Fixture } from "../fixtures/fixture"
import { type Landed, walkDay } from "./oracle-cashflow-day"
import type { OracleTotals } from "./oracle-cashflow-types"
import { oracleAddDays } from "./oracle-date"
import { oracleAmount, oracleEventsByDate } from "./oracle-flow"
import type { OracleState } from "./oracle-state"

export type { OracleTotals } from "./oracle-cashflow-types"

function openStates(fixture: Fixture): Map<string, OracleState> {
	const { scenario, timeline, baseline } = fixture
	const states = new Map<string, OracleState>()
	for (const rule of scenario.accounts) {
		const opening = baseline.balances.find((item) => item.account === rule.id)
		const balance = BigInt(opening?.amount ?? 0)
		states.set(rule.id, { rule, balance, asOf: timeline.start, accrued: 0n })
	}
	return states
}

/** Walks every day of the Timeline and sums each line over the whole period. */
export function oracleCashflow(fixture: Fixture): OracleTotals {
	const { scenario, timeline } = fixture
	const states = openStates(fixture)
	const totals: OracleTotals = {
		planned: new Map(),
		applied: new Map(),
		unfunded: new Map(),
		prepaid: new Map(),
		drawn: new Map(),
		surplus: new Map(),
		unmet: 0n,
	}
	const byDate = oracleEventsByDate(fixture)
	for (let date = timeline.start; date <= timeline.horizon; date = oracleAddDays(date, 1)) {
		const events = byDate.get(date) ?? []
		const landed: Landed[] = events.map((event) => ({
			flow: event.flow,
			amount: oracleAmount(event, scenario.economy.inflation),
		}))
		if (landed.length > 0) walkDay(fixture, states, totals, date, landed)
		if (totals.unmet > 0n) break
	}
	return totals
}
