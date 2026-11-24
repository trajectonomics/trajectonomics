import { declaresEmployer } from "../engine/employer"
import { chargingAccounts } from "../fee/flows"
import { declaresTransfers, declaresWithdrawals } from "../loan/resolve"
import { declaresPayouts, payingAccounts } from "../payout/flows"
import type { AccountId, Scenario } from "../types"

/** What a Scenario declares, so its roll-ups report only the figures it has: each is absent otherwise. */
export interface Declared {
	readonly withdrawals: boolean
	/** A transfer Flow is declared (ADR 0031). */
	readonly transfers: boolean
	readonly employer: boolean
	readonly payouts: boolean
	/** The Accounts that pay out a share above 0 bps, in Scenario order (ADR 0027). */
	readonly paying: readonly AccountId[]
	/** The Accounts that charge a fee above 0 bps, in Scenario order (ADR 0028). */
	readonly fees: readonly AccountId[]
}

export function declaredBy(scenario: Scenario): Declared {
	return {
		withdrawals: declaresWithdrawals(scenario),
		transfers: declaresTransfers(scenario),
		employer: declaresEmployer(scenario),
		payouts: declaresPayouts(scenario),
		paying: payingAccounts(scenario).map((account) => account.id),
		fees: chargingAccounts(scenario).map((account) => account.id),
	}
}
