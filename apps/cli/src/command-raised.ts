import type { ValuationRaised } from "./account/value/codes"

/** The codes a write command raises itself, from the accounts it maps, before the store is asked to write. */
export type CommandRaised =
	// tx add's opening form.
	| "liability_opening_positive"
	// tx add and tx import, from the two accounts they map.
	| "same_account"
	| ValuationRaised
