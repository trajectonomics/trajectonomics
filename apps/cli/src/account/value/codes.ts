/** The codes `account value` raises itself, from the accounts it maps, before the store is asked to write. */
export type ValuationRaised =
	| "valuation_account_invalid"
	| "valuation_against_invalid"
	| "valuation_value_negative"
