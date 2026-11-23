/** The choices of the Withdrawals form's selects, with the words the person reads. */
import type { Choice } from "../plan-items/options"

/** How the rule's payments fall: a rule pays a year in twelve monthly parts or in one annual part (cli ADR 0063). */
export const PAY_CHOICES: readonly Choice[] = [
	{ value: "monthly", label: "Monthly, in twelve equal parts" },
	{ value: "annual", label: "Once a year" },
]

/** How each payment rounds. There is no default: the person states it. */
export const ROUNDING_CHOICES: readonly Choice[] = [
	{ value: "", label: "Choose how to round" },
	{ value: "floor", label: "Down to a minor unit" },
	{ value: "halfUp", label: "To the nearest, a half rounding up" },
	{ value: "ceil", label: "Up to a minor unit" },
]

/** Where the rule starts: at a Milestone, or on a date. */
export const START_CHOICES: readonly Choice[] = [
	{ value: "milestone", label: "At a Milestone" },
	{ value: "date", label: "On a date" },
]

/** How a floor or a ceiling grows from the Flow's start. */
export const BOUND_GROWTH_CHOICES: readonly Choice[] = [
	{ value: "inflation", label: "Follows inflation" },
	{ value: "fixed", label: "A fixed percent a year" },
]
