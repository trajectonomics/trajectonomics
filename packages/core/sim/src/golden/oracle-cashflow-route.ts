import type { Fixture } from "../fixtures/fixture"
import type { DateString } from "../types"
import { add, type OracleTotals } from "./oracle-cashflow-types"
import { oracleDraw, oracleFill } from "./oracle-routing"
import type { OracleState } from "./oracle-state"

/** Fills the surplus steps in order; the totals keep what each Account took. */
export function fillSurplus(
	fixture: Fixture,
	states: Map<string, OracleState>,
	totals: OracleTotals,
	date: DateString,
	amount: bigint,
): void {
	const filled = oracleFill(states, fixture.scenario, fixture.timeline.start, date, amount)
	for (const [account, fill] of filled) add(totals.surplus, account, fill)
}

/**
 * Takes a shortfall from `withdraw` in order, skipping Accounts left out of accessible net worth and
 * keeping each floor; the totals key each take by the entry's position. Returns what stays unmet.
 */
export function drawFrom(
	fixture: Fixture,
	states: Map<string, OracleState>,
	totals: OracleTotals,
	date: DateString,
	amount: bigint,
): bigint {
	const drawn = oracleDraw(states, fixture.scenario, fixture.timeline.start, date, amount)
	for (const [position, take] of drawn.taken) add(totals.drawn, String(position), take)
	return drawn.unmet
}
