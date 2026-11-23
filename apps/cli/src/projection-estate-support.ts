import type { BalanceRow } from "./projection/balances-view"
import type { EstateLineRow, EstateRow } from "./projection/estate-view"
import type { ProjectionRunView } from "./projection/run-view"
import { PROJECTION_SCENARIO, seededHome } from "./projection/testing"
import { tableOf } from "./projection-run-support"
import { applyScenario } from "./scenario-test-support"

/*
 * The readers the `projection run --estate` tests share (cli ADR-0064): the worked example's estate
 * is read from the same run's balances, so each figure is checked by hand in exact integers.
 */

/** A decimal money string as exact minor units. */
export function minor(text: string): bigint {
	return BigInt(text.replace(".", ""))
}

/** Minor units back to a decimal string at two places. */
export function major(units: bigint): string {
	const sign = units < 0n ? "-" : ""
	const text = (units < 0n ? -units : units).toString().padStart(3, "0")
	return `${sign}${text.slice(0, -2)}.${text.slice(-2)}`
}

/** `floor(value x bps / 10000 + 1/2)` for a non-negative value, the half-up share the example's lines state. */
export function halfUp(value: bigint, bps: bigint): bigint {
	return (value * bps + 5_000n) / 10_000n
}

/** The estate row on a date. */
export function estateOn(body: ProjectionRunView, date: string): EstateRow {
	const row = tableOf(body, "estate").rows.find((entry) => entry.date === date)
	if (row === undefined) throw new Error(`no estate on ${date}`)
	return row
}

/** The lines on a date, in the order the table states them. */
export function linesOn(body: ProjectionRunView, date: string): EstateLineRow[] {
	return tableOf(body, "estateLines").rows.filter((entry) => entry.date === date)
}

/** The Accounts' balances on a date, with `--accounts`. */
export function balancesOn(body: ProjectionRunView, date: string): BalanceRow[] {
	return tableOf(body, "balances").rows.filter((entry) => entry.date === date)
}

/** The fixture plan with no estate block, stored as `plain` over the fixture Ledger. */
export async function plainHome(): Promise<string> {
	const home = seededHome()
	const applied = await applyScenario(home, "plain", PROJECTION_SCENARIO)
	if (applied.code !== 0) throw new Error(applied.err)
	return home
}
