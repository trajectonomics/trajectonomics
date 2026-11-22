import { FREQUENCIES } from "./flows"

/** One choice of a select: the value the draft holds and the label the person reads. */
export interface Choice {
	readonly value: string
	readonly label: string
}

/** How often a Flow lands, in the order the CLI lists them. */
export const FREQUENCY_CHOICES: readonly Choice[] = FREQUENCIES.map((frequency) => ({
	value: frequency,
	label: frequency,
}))

/** How a Flow's amount grows: with inflation, or by a fixed percent a year. */
export const GROWTH_CHOICES: readonly Choice[] = [
	{ value: "inflation", label: "Follows inflation" },
	{ value: "fixed", label: "A fixed percent a year" },
]

/** Whether an Account is held (an asset) or owed (a debt, which the document calls a liability). */
export const KIND_CHOICES: readonly Choice[] = [
	{ value: "asset", label: "Asset" },
	{ value: "liability", label: "Debt" },
]

/** How an Account's rate compounds; the blank choice is an effective yearly rate. */
export const COMPOUNDING_CHOICES: readonly Choice[] = [
	{ value: "", label: "Effective yearly rate" },
	{ value: "monthly", label: "Monthly" },
	{ value: "quarterly", label: "Quarterly" },
	{ value: "semiannual", label: "Every six months" },
	{ value: "annual", label: "Yearly" },
]
