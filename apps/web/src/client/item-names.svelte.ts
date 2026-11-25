import {
	householdOf,
	type ItemKind,
	type ItemNames,
	itemNames,
	itemText,
	NO_ITEM_NAMES,
} from "../lib/view/item-names"
import { chooseScenario } from "../lib/view/plan"
import { currentAccountNames } from "./account-names.svelte"
import { currentSearch } from "./location.svelte"
import { currentSnapshot } from "./snapshot.svelte"

/**
 * The names of the plan this page shows, by id: the ledger's Account names and the people of that plan's household. The
 * plan is the one the address names, or the first one, which is how every page chooses (`chooseScenario`). It follows the
 * Snapshot and the address, so an Edit's new Snapshot renames at once. With no ready Snapshot it is empty.
 */
export function currentItemNames(): ItemNames {
	const state = currentSnapshot()
	if (state.status !== "ready") return NO_ITEM_NAMES
	const wanted = new URLSearchParams(currentSearch()).get("scenario") ?? ""
	const plan = chooseScenario(state.snapshot.params.scenarios, wanted)
	return itemNames(currentAccountNames(), householdOf(state.snapshot, plan))
}

/** The words of an id as plain text, for a label that cannot hold markup (an aria-label, an option, a notice). */
export function currentItemText(kind: ItemKind, id: string): string {
	return itemText(currentItemNames(), kind, id)
}
