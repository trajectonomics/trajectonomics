/** The choices of the routing drawers, with the words the person reads. */
import type { Choice } from "../plan-items/options"

/** How much a surplus step takes. */
export const STEP_CHOICES: readonly Choice[] = [
	{ value: "all", label: "Everything that is left" },
	{ value: "upTo", label: "Up to an amount" },
	{ value: "share", label: "A share of what is left" },
	{ value: "shareUpTo", label: "A share of what is left, up to an amount" },
]

/** How an amount grows: it stays as typed, keeps its value in today's money, or grows by a fixed percent a year. */
export const GROWTH_CHOICES: readonly Choice[] = [
	{ value: "none", label: "Stays as typed" },
	{ value: "inflation", label: "Keeps its value in today's money (grows with inflation)" },
	{ value: "fixed", label: "Grows by a fixed percent a year" },
]

/** How much a transfer moves. */
export const MOVE_CHOICES: readonly Choice[] = [
	{ value: "all", label: "All of it" },
	{ value: "amount", label: "An amount" },
	{ value: "share", label: "A share of what the account holds" },
]

/** When a transfer starts. A Milestone and a household date are offered only when the plan has one. */
export const WHEN_CHOICES: readonly Choice[] = [
	{ value: "date", label: "On a date" },
	{ value: "milestone", label: "When a Milestone fires" },
	{ value: "anchor", label: "On a date the household names" },
]

/** What `realise` means, in the words the drawer shows under it. */
export const REALISE_WORDS =
	"Count any gain for tax. Off by default: in Thailand a gain on listed shares and on mutual funds held by an individual is generally not taxed, and moving money from one fund to another is the usual case. Turn it on when the move should count as a sale, so the gain is added up for your tax."
