import type { CashflowRow } from "./projection/cashflow-view"
import type { ProjectionRunView } from "./projection/run-view"
import { tableOf } from "./projection-run-support"

/** The readers the tests of an Account's payout and fee and of an employer's share share (cli ADR-0067). */

/** The exact sum, in satang, of decimal money strings. */
export function satang(amounts: readonly string[]): bigint {
	return amounts.reduce((sum, text) => sum + BigInt(text.replace(".", "")), 0n)
}

/** The cash-flow lines of one roll-up and group. */
export function linesOf(body: ProjectionRunView, index: number, group: string): CashflowRow[] {
	return tableOf(body, "cashflow").rows.filter((row) => row.index === index && row.group === group)
}
