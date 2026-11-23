/**
 * A real asset as its form holds it: text only, every rate and amount as the person typed it. No percent has a
 * value until the person types one, and a rounding has none until they choose it (web ADR 0011). The parts a
 * draft saves as are built in `asset-build.ts`, and its checks are in `asset-check.ts`.
 */

import { type LoanDraft, loanDraftOf } from "./loan-draft"

/** A computed or fixed amount a form holds: how it is stated, and the text of each way to state it. */
export interface AmountDraft {
	/** "none", "percent" (of the asset's value) or "amount" (fixed). */
	readonly mode: string
	/** A yearly percent of the value, such as "1.5". Empty until typed. */
	readonly rate: string
	readonly amount: string
	/** "inflation" or "fixed", for a fixed amount's yearly growth. */
	readonly growth: string
	readonly growthRate: string
}

/** The text of a real-asset form. */
export interface AssetDraft {
	readonly name: string
	/** "buy" (bought on a date) or "owned" (the Baseline holds it). */
	readonly ownership: string
	/** The Scenario id of the Baseline's asset "I own it already" attaches to: "" until chosen. */
	readonly ownedAccount: string
	/** "" until chosen, then "rise" or "fall": the value's change each year. */
	readonly direction: string
	readonly valueRate: string
	/** When an owned asset's running costs and rent start. */
	readonly from: string
	readonly purchaseDate: string
	readonly price: string
	readonly buyCost: string
	/** "savings" or "loan". */
	readonly paying: string
	readonly loan: LoanDraft
	readonly running: AmountDraft
	/** "" until chosen: the rounding of every amount computed from the value. */
	readonly rounding: string
	readonly category: string
	readonly rent: AmountDraft
	/** "none" or "date". */
	readonly selling: string
	readonly saleDate: string
	readonly saleCost: AmountDraft
}

export const NO_AMOUNT: AmountDraft = {
	mode: "none",
	rate: "",
	amount: "",
	growth: "inflation",
	growthRate: "",
}

/** The loan of a new asset: no number stated, borrowed on the purchase date. */
function emptyLoan(): LoanDraft {
	return loanDraftOf()
}

/** The form's text for a new asset: bought on a date, nothing chosen, no percent typed. */
export function newAssetDraft(): AssetDraft {
	return {
		name: "",
		ownership: "buy",
		ownedAccount: "",
		direction: "",
		valueRate: "",
		from: "",
		purchaseDate: "",
		price: "",
		buyCost: "",
		paying: "savings",
		loan: emptyLoan(),
		running: NO_AMOUNT,
		rounding: "",
		category: "",
		rent: NO_AMOUNT,
		selling: "none",
		saleDate: "",
		saleCost: NO_AMOUNT,
	}
}

/** The fields of a draft that work an amount out as a percent of the asset's value, in the order the form lists them. */
export function percentFields(draft: AssetDraft): string[] {
	const parts: [string, AmountDraft][] = [
		["running.rate", draft.running],
		["rent.rate", draft.rent],
		...(draft.selling === "date"
			? [["saleCost.rate", draft.saleCost] as [string, AmountDraft]]
			: []),
	]
	return parts.filter(([, part]) => part.mode === "percent").map(([field]) => field)
}
