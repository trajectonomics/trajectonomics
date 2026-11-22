import type { FiResult } from "../../contract"
import { formatDate } from "../../format"

/** The rule-of-thumb reference the CLI states beside a reachable FI date. */
export type Reference = Extract<FiResult, { reachable: true }>["reference"]

/** One money figure of the reference, as the CLI states it, with its label. */
export interface ReferenceAmount {
	readonly label: string
	readonly amount: string
}

/** The reference in the words a reader checks it with. It is a reference, never the answer. */
export interface ReferenceView {
	readonly multiplier: string
	readonly date: string
	readonly basis: string
	readonly window: string
	readonly terms: string
	readonly met: string
	readonly partial: string
	readonly multiple: string | null
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
	nominal: "Nominal money",
	real: "Real money",
}

/** The reference, with its figures, its basis, window and terms, and whether it is met or partial. */
export function referenceOf(reference: Reference): ReferenceView {
	return {
		multiplier: `${reference.multiplier}×`,
		date: formatDate(reference.date),
		basis: BASIS_LABELS[reference.basis],
		window: WINDOW_LABELS[reference.window],
		terms: TERMS_LABELS[reference.terms],
		met: reference.met ? "Met" : "Not met",
		partial: reference.partial
			? "Partial: the window holds less than twelve months"
			: "Full: the window holds twelve months",
		multiple: multipleText(reference.multipleBps),
		amounts: [
			{ label: "Unlocked assets", amount: reference.unlockedAssets },
			{ label: "Numerator", amount: reference.numerator },
			{ label: "Annual expenses", amount: reference.annualExpenses },
			{ label: "Threshold", amount: reference.threshold },
		],
	}
}

function multipleText(bps: number | null): string | null {
	if (bps === null) return null
	return `${bps} basis points, where 10,000 is one times`
}
