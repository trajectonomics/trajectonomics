import { closed, MINOR_UNITS_HEAD } from "./terms"

/*
 * The units and closed sets of the estate block (sim ADR 0025, cli ADR-0064), kept apart from
 * `terms.ts` so each is stated once beside the shape that uses it.
 */

/** The unit of an estate line's fixed amount. The decimal form replaces it, so `ESTATE_ONCE` follows it in both forms. */
export const ESTATE_UNITS: string = `${MINOR_UNITS_HEAD}.`

/** What an estate line's fixed amount is stated in, once: the money of the plan's start, then grown by whole years. */
export const ESTATE_ONCE =
	"An estate line states it once, in the money of the Timeline's start, not per occurrence or per year."

/** The unit of an estate line's share: basis points as the engine states them. The decimal form writes it as a percent. */
export const ESTATE_RATE_UNITS =
	"Integer basis points of an estate line (1 bps = 0.01%), so 1% is 100. The share is the caller's own figure: `traj` ships none."

/** The unit of an estate line's share in the decimal form: a percent string, exact to the basis point. */
export const ESTATE_PERCENT_UNITS =
	'A percent string of an estate line (never a JSON number), such as "1.00" for 1%, with at most two places: "1.00" is 100 basis points. The share is the caller\'s own figure: `traj` ships none.'

/** What a cost's `of` may be besides `{ accounts }`: read from the vocabulary `check()` tests against. */
export const ESTATE_COST_BASES: readonly string[] = closed("INVALID_BASIS", ["estate", "costs"])

/** What a gift's `of` may be: the net estate. */
export const ESTATE_GIFT_BASES: readonly string[] = closed("INVALID_BASIS", ["estate", "gifts"])
