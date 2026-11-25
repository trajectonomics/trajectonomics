import { type ItemKind, type ItemNames, itemText } from "../item-names"

/**
 * What the planner's item drawer is open on: an item to edit (or none, for a new one), in which form, and
 * whether it tries a value in the What-if session instead of saving one.
 */
export interface PlanDrawer {
	/** The item's id: a Flow's or an Account's, or a loan's liability Account. Absent for a new item. */
	readonly id?: string
	/** True when the drawer tries a value in the What-if session. */
	readonly tryValue?: boolean
	/** True when the drawer edits a loan (its Account, its payments and its withdrawal) rather than an Account. */
	readonly loan?: boolean
	/** True when the drawer pays a loan extra, by the id of the loan. */
	readonly extra?: boolean
	/** True when the drawer edits a real asset (a home or car), by the id of its Account. */
	readonly asset?: boolean
}

/** The words of an item: the label a Read states for it, or the id (`itemText`). */
function itemName(drawer: PlanDrawer, names: ItemNames, kind: ItemKind): string {
	return itemText(names, kind, drawer.id ?? "")
}

/** The heading of a form that edits one item: "Add" without an id, "Try a value for" or "Edit" with one. */
function itemTitle(
	drawer: PlanDrawer,
	adding: string,
	thing: string,
	names: ItemNames,
	kind: ItemKind,
): string {
	if (drawer.id === undefined) return adding
	return drawer.tryValue === true
		? `Try a value for ${thing}${itemName(drawer, names, kind)}`
		: `Edit ${thing}${itemName(drawer, names, kind)}`
}

/** The drawer's heading: what it does to which item, in the noun of its page, named as a Read states it. */
export function drawerTitle(
	drawer: PlanDrawer,
	noun: string,
	names: ItemNames,
	kind: ItemKind,
): string {
	if (drawer.extra === true) return `Pay extra on ${itemName(drawer, names, kind)}`
	if (drawer.asset === true) return itemTitle(drawer, "Add a home or car", "", names, kind)
	if (drawer.loan === true) return itemTitle(drawer, "Add loan", "loan ", names, kind)
	return itemTitle(drawer, `Add ${noun}`, "", names, kind)
}
