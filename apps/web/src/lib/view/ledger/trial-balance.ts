import type { Balance } from "../../contract"

/** One line of the trial balance: a leaf account's debit or credit, exactly as the CLI states it. */
export interface TrialBalanceLine {
	readonly key: string
	readonly account: string
	readonly currency: string
	readonly debit: string
	readonly credit: string
}

/** A currency's totals as the CLI states them. */
export interface TrialBalanceTotal {
	readonly currency: string
	readonly debit: string
	readonly credit: string
}

/** The trial balance of a Balance read, or null when the CLI stated none. */
export interface TrialBalanceView {
	readonly lines: readonly TrialBalanceLine[]
	readonly totals: readonly TrialBalanceTotal[]
}

/** The trial balance rows and totals in the CLI's order. The page does not add to them. */
export function trialBalanceView(trial: Balance["trialBalance"]): TrialBalanceView | null {
	if (trial === undefined) return null
	return {
		lines: trial.rows.map((row, index) => ({
			key: `${index}`,
			account: row.account.name,
			currency: row.currency,
			debit: row.debit,
			credit: row.credit,
		})),
		totals: trial.totals.map((total) => ({ ...total })),
	}
}
