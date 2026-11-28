import type { CashflowLines } from "@trajectonomics/core/sim"
import type { CashflowRow } from "./cashflow-view"

/*
 * The two lines an Account's payout and an employer's share add to `projection run --breakdown` (cli
 * ADR-0058, ADR-0067), named in the long-table shape. The engine states each and its amount.
 */

/** One engine line before it is named: its group, its names and its engine minor units. */
export type Line = Omit<CashflowRow, "index" | "from" | "to" | "amount"> & { minor: number }

const NONE = { id: null, account: null, category: null }

/** A roll-up's payouts, one `payout` line per Account, present only when the Scenario declares a payout. */
export function payoutLines(breakdown: CashflowLines): Line[] {
	return (breakdown.payouts ?? []).map((line) => ({
		...NONE,
		group: "payout",
		account: line.account,
		minor: line.amount,
	}))
}

/** A roll-up's employer Contributions, one `employer` line per Flow, outside money in. */
export function employerLines(breakdown: CashflowLines): Line[] {
	return (breakdown.employer ?? []).map((line) => ({
		...NONE,
		group: "employer",
		id: line.flow,
		account: line.account,
		minor: line.amount,
	}))
}
