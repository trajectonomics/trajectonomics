import type { ScenarioDocument } from "../../contract"
import { groupedIds, realAssetsOf } from "./asset-document"
import { loanPartsOf } from "./loan-document"
import { plainAccounts } from "./unplaced"

/** What the Plan's strip of tabs shows under its chart. */
export type PlanTab = "income" | "expenses" | "assets" | "milestones"

/** How a card list is drawn: the page's full card, or the Plan's one-line compact card. */
export type PlanDensity = "full" | "compact"

/** The tabs, in the order the strip lays them out. */
export const PLAN_TABS = [
	{ id: "income", label: "Income" },
	{ id: "expenses", label: "Expenses" },
	{ id: "assets", label: "Assets and debts" },
	{ id: "milestones", label: "Milestones" },
] as const satisfies readonly { readonly id: PlanTab; readonly label: string }[]

/** The tab an `items` query value names, and Income for a value this page does not know. */
export function tabOf(value: string): PlanTab {
	return PLAN_TABS.some((tab) => tab.id === value) ? (value as PlanTab) : "income"
}

/**
 * The index a key moves the tab strip to: Right and Left move and wrap, Home and End jump to the ends, and
 * any other key returns null so the browser keeps it.
 */
export function tabIndexFor(count: number, index: number, key: string): number | null {
	if (count === 0) return null
	if (key === "ArrowRight") return index === count - 1 ? 0 : index + 1
	if (key === "ArrowLeft") return index === 0 ? count - 1 : index - 1
	if (key === "Home") return 0
	if (key === "End") return count - 1
	return null
}

/** One tab with its name and the number of items the plan's document states for it. */
export interface PlanTabInfo {
	readonly id: PlanTab
	readonly label: string
	readonly count: number
}

/** The Flows of one kind the page lists: a real asset's parts are on its card, so they are not counted. */
function flowCount(doc: ScenarioDocument | null, kind: "income" | "expense"): number {
	if (doc === null) return 0
	const grouped = groupedIds(doc)
	return doc.flows.filter((flow) => flow.kind === kind && !grouped.has(flow.id)).length
}

/** The Accounts and debts of the Assets and debts page: its plain Accounts, its homes and cars, and its loans. */
function assetCount(doc: ScenarioDocument | null): number {
	if (doc === null) return 0
	return plainAccounts(doc).length + realAssetsOf(doc).length + loanPartsOf(doc).length
}

/** The tabs with their counts, read from the plan's document. Every count is 0 without one. */
export function planTabs(doc: ScenarioDocument | null): PlanTabInfo[] {
	const counts: Readonly<Record<PlanTab, number>> = {
		income: flowCount(doc, "income"),
		expenses: flowCount(doc, "expense"),
		assets: assetCount(doc),
		milestones: doc?.milestones?.length ?? 0,
	}
	return PLAN_TABS.map((tab) => ({ ...tab, count: counts[tab.id] }))
}
