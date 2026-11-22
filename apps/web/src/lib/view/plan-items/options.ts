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

/** The roles a person in a household may hold (cli ADR-0048). */
export const ROLE_CHOICES: readonly Choice[] = [
	{ value: "holder", label: "Account holder" },
	{ value: "partner", label: "Partner" },
	{ value: "dependent", label: "Dependent" },
]

/** How a dependent relates to the account holder. */
export const RELATION_CHOICES: readonly Choice[] = [
	{ value: "child", label: "Child" },
	{ value: "parent", label: "Parent" },
	{ value: "other", label: "Other" },
]

/** The date of a Flow an anchor pins: its start or its end. */
export const EDGE_CHOICES: readonly Choice[] = [
	{ value: "start", label: "Starts" },
	{ value: "end", label: "Ends" },
]

/** What an anchor pins the date to: a person's age, their life end, or a partner's joining. */
export const WHEN_CHOICES: readonly Choice[] = [
	{ value: "age", label: "At an age" },
	{ value: "lifeEnd", label: "At life end" },
	{ value: "joins", label: "At joining" },
]
