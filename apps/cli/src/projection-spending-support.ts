import type { Scenario } from "@trajectonomics/core/sim"
import { FIXTURE_ACCOUNTS } from "./ledger-fixture"
import type { ProjectionRunView } from "./projection/run-view"
import type { SpendingRuleRow } from "./projection/spending-view"
import { PROJECTION_SCENARIO, seededHome } from "./projection/testing"
import { tableOf } from "./projection-run-support"
import { applyScenario } from "./scenario-test-support"

/*
 * The fixtures and readers the `projection run --spending` tests share (cli ADR-0063): the worked
 * example of `traj schema scenario apply` (its `retirement-spending` rule starts when `retire` fires
 * on 2045-01-01), and a small plan on the fixture Ledger whose portfolio first grows and then loses
 * a boat, so one run shows a year with no action, two raises and two cuts.
 */

/** The example, run from the 15th for thirty years: the rule's first year is 2045 and it cuts in 2049. */
export const EXAMPLE_FLAGS: readonly string[] = [
	"--scenario",
	"example",
	"--as-of",
	"2026-01-15",
	"--horizon",
	"2055-12-31",
]

const BANK = FIXTURE_ACCOUNTS.bank

/**
 * A guardrails rule at 4% on the bank Account alone, growing 20% a year under no inflation, with
 * bands of 20% above and 10% below and an adjustment of 10% each way, and a 400,000.00 THB boat in
 * October 2028. Every number is a stated test value, as a rule's always are.
 */
export const RAISE_PLAN: Scenario = {
	...PROJECTION_SCENARIO,
	economy: { inflation: 0 },
	accounts: PROJECTION_SCENARIO.accounts.map((account) =>
		account.id === BANK ? { ...account, rate: 2000 } : account,
	),
	flows: [
		{
			id: "spending",
			kind: "expense",
			frequency: "monthly",
			start: "2026-04-01",
			rule: {
				kind: "guardrails",
				portfolio: [BANK],
				rateBps: 400,
				rounding: "floor",
				upper: { bps: 2000, adjustBps: 1000 },
				lower: { bps: 1000, adjustBps: 1000 },
			},
		},
		{
			id: "boat",
			kind: "expense",
			frequency: "once",
			start: "2028-10-01",
			amount: 40_000_000,
			growth: { bps: 0 },
		},
	],
	cashflow: { surplus: [{ account: BANK }], contribute: [], withdraw: [BANK] },
}

/** The dates the raise plan is run between: five Rule years from 2026-04-01. */
export const RAISE_FLAGS: readonly string[] = [
	"--scenario",
	"raise",
	"--as-of",
	"2026-03-31",
	"--horizon",
	"2031-03-31",
]

/** The fixture Ledger with the raise plan stored as `raise`. */
export async function raiseHome(): Promise<string> {
	const home = seededHome()
	const applied = await applyScenario(home, "raise", RAISE_PLAN)
	if (applied.code !== 0) throw new Error(applied.err)
	return home
}

/** The rows of one rule Flow, in year order. */
export function yearsOf(body: ProjectionRunView, flow: string): SpendingRuleRow[] {
	return tableOf(body, "spendingRules").rows.filter((row) => row.flow === flow)
}

/** A decimal money string as exact minor units, for the integer checks the tests make by hand. */
export function minor(text: string): bigint {
	return BigInt(text.replace(".", ""))
}

/** Minor units back to a decimal string at two places, so a hand figure compares to the CLI's. */
export function major(units: bigint): string {
	const text = units.toString().padStart(3, "0")
	return `${text.slice(0, -2)}.${text.slice(-2)}`
}
