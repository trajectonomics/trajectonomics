import type { Balance } from "../../contract"
import { type AccountNames, NO_NAMES, refLabel } from "../account-names"

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
	/** Set when the totals are not stated because a column's sum is out of range; the rows are still stated. */
	readonly note: string | null
}

/** The trial balance rows and totals in the CLI's order. The page does not add to them. */
export function trialBalanceView(
	trial: Balance["trialBalance"],
	names: AccountNames = NO_NAMES,
): TrialBalanceView | null {
	if (trial === undefined) return null
	return {
		lines: trial.rows.map((row, index) => ({
			key: `${index}`,
			account: refLabel(names, row.account),
			currency: row.currency,
			debit: row.debit,
			credit: row.credit,
		})),
		totals: (trial.totals ?? []).map((total) => ({ ...total })),
		note: unavailableTotalsNote(trial),
	}
}

/** The plain statement that the totals are not stated because a column's sum is out of range, or null when they are. */
export function unavailableTotalsNote(trial: NonNullable<Balance["trialBalance"]>): string | null {
	if (trial.totals !== null) return null
	return "The totals are not stated: every account is in range, but their sum exceeds the safe integer range. Each account's debit and credit is shown above."
}
