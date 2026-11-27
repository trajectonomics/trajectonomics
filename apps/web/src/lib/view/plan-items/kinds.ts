/** The planner pages: the Flows of one kind, or the Accounts of the plan. */
export type PlanKind = "income" | "expense" | "assets"

/** A page's heading and the noun its drawer names an item by. */
export interface PlanPage {
	readonly title: string
	readonly noun: string
}

/** The three planner pages, by kind. */
export const PLAN_PAGES: Readonly<Record<PlanKind, PlanPage>> = {
	income: {
		title: "Income",
		noun: "income",
	},
	expense: {
		title: "Expenses",
		noun: "expense",
	},
	assets: {
		title: "Assets and debts",
		noun: "account",
	},
}
