import { categorisedFreelancer } from "./expense-category-cases"
import type { ParityCase } from "./parity-cases"

/** Projections of Scenarios that carry expense categories; each must hash as its uncategorised twin. */
export const CATEGORY_PARITY_CASES: readonly ParityCase[] = [
	{ name: "freelancer-categorised-day", fixture: categorisedFreelancer },
]
