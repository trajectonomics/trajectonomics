import { type ItemKind, type ItemNames, itemText } from "../item-names"
import type { ItemsView } from "../what-if/plan-changes"
import type { AssetCardView } from "./asset-card"
import type { FlowCard } from "./flows"
import type { PlanKind } from "./kinds"

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
	/** True when the drawer opens on the item's full card first, with its form below when the page edits. */
	readonly details?: boolean
}

/** The words of an item: the label a Read states for it, or the id (`itemText`). */
function itemName(drawer: PlanDrawer, names: ItemNames, kind: ItemKind): string {
	return itemText(names, kind, drawer.id ?? "")
}

/** The heading of a form that edits one item: "Add" without an id, "What if…" or "Edit" with one. */
function itemTitle(
	drawer: PlanDrawer,
	adding: string,
	thing: string,
	names: ItemNames,
	kind: ItemKind,
): string {
	if (drawer.id === undefined) return adding
	return drawer.tryValue === true
		? `What if… ${thing}${itemName(drawer, names, kind)}`
		: `Edit ${thing}${itemName(drawer, names, kind)}`
}

/** The drawer's heading: what it does to which item, in the noun of its page, named as a Read states it. */
export function drawerTitle(
	drawer: PlanDrawer,
	noun: string,
	names: ItemNames,
	kind: ItemKind,
): string {
	if (drawer.details === true) return itemName(drawer, names, kind)
	if (drawer.extra === true) return `Pay extra on ${itemName(drawer, names, kind)}`
	if (drawer.asset === true) return itemTitle(drawer, "Add a home or car", "", names, kind)
	if (drawer.loan === true) return itemTitle(drawer, "Add loan", "loan ", names, kind)
	return itemTitle(drawer, `Add ${noun}`, "", names, kind)
}

/**
 * The drawer's state when a face's "What if…" is chosen: the item the face states is tried in the same form, so
 * a loan keeps its terms and a home or car its values, as the full page's card does.
 */
export function tryDrawer(drawer: PlanDrawer, id: string): PlanDrawer {
	return {
		id,
		tryValue: true,
		...(drawer.loan === true ? { loan: true } : {}),
		...(drawer.asset === true ? { asset: true } : {}),
	}
}

/**
 * Whether the drawer's form may edit the open item. A computed Flow has no amount the form could edit, and a
 * home or car whose parts were changed outside its form is refused, as the pages already leave both without
 * an Edit control (web ADR 0011).
 */
export function canEdit(
	kind: PlanKind,
	drawer: PlanDrawer,
	lists: {
		readonly flows: ItemsView<FlowCard>
		readonly assets: readonly AssetCardView[]
	},
): boolean {
	if (drawer.id === undefined) return true
	if (kind !== "assets") {
		return lists.flows.cards.find((card) => card.id === drawer.id)?.editable === true
	}
	if (drawer.asset !== true) return true
	const asset = lists.assets.find((card) => card.id === drawer.id)
	return asset !== undefined && asset.outside.length === 0
}
