import { declaresEmployer } from "../engine/employer"
import { chargingAccounts } from "../fee/flows"
import { declaresWithdrawals } from "../loan/resolve"
import { declaresPayouts } from "../payout/flows"
import type { AccountId, Scenario } from "../types"

/** What a Scenario declares, so its roll-ups report only the figures it has: each is absent otherwise. */
export interface Declared {
	readonly withdrawals: boolean
	readonly employer: boolean
	readonly payouts: boolean
	/** The Accounts that charge a fee above 0 bps, in Scenario order (ADR 0028). */
	readonly fees: readonly AccountId[]
}

export function declaredBy(scenario: Scenario): Declared {
	return {
		withdrawals: declaresWithdrawals(scenario),
		employer: declaresEmployer(scenario),
		payouts: declaresPayouts(scenario),
		fees: chargingAccounts(scenario).map((account) => account.id),
	}
}
