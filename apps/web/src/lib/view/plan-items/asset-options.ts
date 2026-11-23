import type { Choice } from "./options"

/** How the person holds the asset: it is in the Baseline already, or it is bought on a date. */
export const OWNERSHIP_CHOICES: readonly Choice[] = [
	{ value: "owned", label: "I own it already (the Baseline holds its value)" },
	{ value: "buy", label: "I will buy it on a date" },
]

/** Whether its value rises or falls each year. The first choice is none: the person states the direction. */
export const DIRECTION_CHOICES: readonly Choice[] = [
	{ value: "", label: "Choose rising or falling" },
	{ value: "rise", label: "Rises each year" },
	{ value: "fall", label: "Falls each year" },
]

/** How the purchase is paid for. */
export const PAYING_CHOICES: readonly Choice[] = [
	{ value: "savings", label: "From savings" },
	{ value: "loan", label: "With a loan" },
]

/** Whether the asset is sold. */
export const SELLING_CHOICES: readonly Choice[] = [
	{ value: "none", label: "I will keep it" },
	{ value: "date", label: "I will sell it on a date" },
]

/** How running costs are stated. */
export const RUNNING_CHOICES: readonly Choice[] = [
	{ value: "none", label: "No running costs" },
	{ value: "percent", label: "A yearly percent of its value" },
	{ value: "amount", label: "A fixed amount each month" },
]

/** How rent is stated. */
export const RENT_CHOICES: readonly Choice[] = [
	{ value: "none", label: "No rent" },
	{ value: "percent", label: "A yearly percent of its value" },
	{ value: "amount", label: "A fixed amount each month" },
]

/** How the costs of selling are stated. */
export const SALE_COST_CHOICES: readonly Choice[] = [
	{ value: "none", label: "No selling costs" },
	{ value: "percent", label: "A percent of its value" },
	{ value: "amount", label: "A fixed amount" },
]
