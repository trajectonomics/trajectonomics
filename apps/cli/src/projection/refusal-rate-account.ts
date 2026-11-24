import { type Entry, UNIT } from "./refusal-rate-unit"

/*
 * The sentences for a rate out of range on an Account's payout and fee (sim ADR 0027, ADR 0028, cli
 * ADR-0067), chosen by the path the engine blames, as `RATE_OUT_OF_RANGE`'s others are (cli ADR-0065).
 */

/** Under --decimal an Account's payout and fee are percent strings (cli ADR-0067). */
const ACCOUNT_DECIMAL =
	'Under --decimal it is a percent string such as "1.50", with at most two decimal places.'

const PAYOUT: Entry = {
	message:
		"The share an Account pays out each year must be from 0% to 100% of its value, and this one is not.",
	hint: `${UNIT} ${ACCOUNT_DECIMAL} A payout of 0 is none.`,
}

const FEE: Entry = {
	message:
		"The fee an Account charges each year must be from 0% to 100% of its value, and this one is not.",
	hint: `${UNIT} ${ACCOUNT_DECIMAL} A fee of 0 is none.`,
}

const PAYOUT_PREPAYMENTS: Entry = {
	message:
		"The Levy prepayments of an Account's payout ask for more than 100% of each payout, or one share is outside 0% to 100%.",
	hint: `${UNIT} Lower the shares so that they add up to 10000 or less.`,
}

/** The entry for a problem under `accounts`: its rate, its fee or its payout, else `general`. */
export function accountEntry(segments: readonly string[], rate: Entry, general: Entry): Entry {
	if (segments[2] === "rate") return rate
	if (segments[2] === "fee") return FEE
	if (segments[2] !== "payout") return general
	return segments[3] === "prepayments" ? PAYOUT_PREPAYMENTS : PAYOUT
}
