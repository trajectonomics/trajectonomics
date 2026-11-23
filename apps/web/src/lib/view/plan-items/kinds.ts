/** The planner pages: the Flows of one kind, or the Accounts of the plan. */
export type PlanKind = "income" | "expense" | "assets"

/** A page's heading, its one-sentence intro, and the noun its drawer names an item by. */
export interface PlanPage {
	readonly title: string
	readonly intro: string
	readonly noun: string
}

/** The three planner pages, by kind. */
export const PLAN_PAGES: Readonly<Record<PlanKind, PlanPage>> = {
	income: {
		title: "Income",
		intro:
			"What comes in under the selected plan: each income Flow with its amount per occurrence, how often it lands and how it grows.",
		noun: "income",
	},
	expense: {
		title: "Expenses",
		intro:
			"What goes out under the selected plan: each expense Flow with its amount, how often it lands and how it grows.",
		noun: "expense",
	},
	assets: {
		title: "Assets and debts",
		intro:
			"The Accounts of the selected plan with their rates and each one's balance in the Baseline. Its loans are listed read-only below them.",
		noun: "account",
	},
}
