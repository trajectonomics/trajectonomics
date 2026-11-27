import type { FiResult } from "../../contract"
import { formatDate, formatMultiple } from "../../format"

/** The rule-of-thumb reference the CLI states beside a reachable FI date. */
export type Reference = Extract<FiResult, { reachable: true }>["reference"]

/** One money figure of the reference, as the CLI states it, with its label. */
export interface ReferenceAmount {
	readonly label: string
	readonly amount: string
}

/** The reference in the words a reader checks it with. It is a reference, never the answer. */
export interface ReferenceView {
	readonly date: string
	readonly basis: string
	readonly window: string
	readonly terms: string
	readonly met: string
	readonly partial: string
	/** The CLI's multiple in words, with its own reference value, always stated: "14.5× a year of spending (reference: 25×)", or "No multiple (reference: 25×)". */
	readonly multipleInWords: string
	/** The same multiple as the CLI states it: "145376 basis points, where 10,000 is one times". */
	readonly multipleRaw: string | null
	/** The figure the multiple divides, kept for the result's Details. */
	readonly numerator: string
	readonly amounts: readonly ReferenceAmount[]
}

const BASIS_LABELS: Record<Reference["basis"], string> = {
	unlockedAssets: "Unlocked assets",
	allAssets: "All assets",
	accessibleNetWorth: "Accessible net worth",
	netWorth: "Net worth",
}

const WINDOW_LABELS: Record<Reference["window"], string> = {
	next12Months: "The next twelve months of expenses",
	trailing12Months: "The trailing twelve months of expenses",
}

const TERMS_LABELS: Record<Reference["terms"], string> = {
	nominal: "Future money",
	real: "Today's money",
}

/** The reference, with its figures, its basis, window and terms, and whether it is met or partial. */
export function referenceOf(reference: Reference): ReferenceView {
	return {
		date: formatDate(reference.date),
		basis: BASIS_LABELS[reference.basis],
		window: WINDOW_LABELS[reference.window],
		terms: TERMS_LABELS[reference.terms],
		met: reference.met ? "Met" : "Not met",
		partial: reference.partial
			? "Partial: the window holds less than twelve months"
			: "Full: the window holds twelve months",
		multipleInWords: multipleInWords(reference),
		multipleRaw: multipleRaw(reference.multipleBps),
		numerator: reference.numerator,
		amounts: [
			{ label: "Unlocked assets", amount: reference.unlockedAssets },
			{ label: "Annual expenses", amount: reference.annualExpenses },
			{ label: "Threshold", amount: reference.threshold },
		],
	}
}

function multipleInWords(reference: Reference): string {
	const stated = `reference: ${reference.multiplier}×`
	if (reference.multipleBps === null) return `No multiple (${stated})`
	// The engine does not annualise a partial window, so its expenses are the window's, not a year's.
	const spending = reference.partial ? "the spending in the window" : "a year of spending"
	return `${formatMultiple(reference.multipleBps)} ${spending} (${stated})`
}

function multipleRaw(bps: number | null): string | null {
	return bps === null ? null : `${bps} basis points, where 10,000 is one times`
}
