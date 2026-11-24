import type { AccountId, MinorUnits } from "./common"

/**
 * One Account's figures over the whole horizon (ADR 0027, 0028). Each is the sum of the Account's
 * Annual roll-up figures, and is present only when the Account declares that item above 0 bps.
 */
export interface AccountLifetime {
	readonly account: AccountId
	/** What the Account was charged in all; present only with a fee above 0 bps, 0 if never charged. */
	readonly lifetimeFees?: MinorUnits
	/** What the Account paid out in all; present only with a payout above 0 bps, 0 if it never paid. */
	readonly lifetimePayouts?: MinorUnits
}
