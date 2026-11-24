import { closed } from "./terms"

/*
 * The units and closed sets of an Account's payout and fee (sim ADR 0027, ADR 0028, cli ADR-0067),
 * kept apart from `terms.ts` so each is stated once beside the shape that uses it.
 */

/** The unit of a payout's and a fee's yearly share: basis points as the engine states them. The decimal form writes it as a percent. */
export const ACCOUNT_RATE_UNITS =
	"Integer basis points of an Account's payout or fee (1 bps = 0.01%), so 1.5% is 150. The share is the caller's own figure: `traj` ships none."

/** The unit of a payout's and a fee's share in the decimal form: a percent string, exact to the basis point. */
export const ACCOUNT_PERCENT_UNITS =
	"A percent string of an Account's payout or fee (never a JSON number), such as \"1.50\" for 1.5%, with at most two places, so every share is exact to the basis point. The share is the caller's own figure: `traj` ships none."

/** The calendar period a payout lands at the end of: read from the vocabulary `check()` tests against. */
export const PAYOUT_FREQUENCIES: readonly string[] = closed("INVALID_FREQUENCY", [
	"accounts",
	"payout",
])
