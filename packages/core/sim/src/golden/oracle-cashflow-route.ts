import type { Fixture } from "../fixtures/fixture"
import type { DateString } from "../types"
import { oracleLeftOut } from "./oracle-access"
import { add, min, type OracleTotals } from "./oracle-cashflow-types"
import { type OracleState, oracleMutate, oracleValuation } from "./oracle-state"

/** Fills the surplus steps in order; an unbounded step takes whatever is left. */
export function fillSurplus(
	fixture: Fixture,
	states: Map<string, OracleState>,
	totals: OracleTotals,
	date: DateString,
	amount: bigint,
): void {
	let remaining = amount
	for (const step of fixture.scenario.cashflow.surplus) {
		if (remaining === 0n) return
		const state = states.get(step.account)!
		const headroom =
			step.upTo === undefined ? remaining : BigInt(step.upTo) - oracleValuation(state, date)
		const fill = headroom > 0n ? min(remaining, headroom) : 0n
		if (fill === 0n) continue
		oracleMutate(state, date, fill)
		add(totals.surplus, step.account, fill)
		remaining -= fill
	}
}

/**
 * Takes a shortfall from `withdraw` in order, skipping Accounts left out of accessible net worth;
 * returns what stays unmet.
 */
export function drawFrom(
	fixture: Fixture,
	states: Map<string, OracleState>,
	totals: OracleTotals,
	date: DateString,
	amount: bigint,
): bigint {
	let remaining = amount
	for (const account of fixture.scenario.cashflow.withdraw) {
		if (remaining === 0n) return 0n
		const state = states.get(account)!
		if (oracleLeftOut(state.rule, date)) continue
		const take = min(remaining, oracleValuation(state, date))
		if (take <= 0n) continue
		oracleMutate(state, date, -take)
		add(totals.drawn, account, take)
		remaining -= take
	}
	return remaining
}
