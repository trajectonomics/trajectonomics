/** A change's label with the words a Read states in place of an item's id. Pure; a label that names no item is as it was. */
import { type ItemKind, type ItemNames, itemText } from "../view/item-names"
import type { Change } from "./session-changes"

/** The list and the id a path names (`accounts.fund.rate` names `fund` in `accounts`), or null for a path of neither. */
function itemOf(path: string): { list: string; id: string } | null {
	const [list, id] = path.split(".")
	if (list === undefined || id === undefined) return null
	return list === "accounts" || list === "flows" || list === "milestones" ? { list, id } : null
}

/** The item kind a document list names: `flows` holds Flows, and `milestones` Milestones. */
function kindOf(list: string): ItemKind {
	if (list === "accounts") return "account"
	return list === "flows" ? "flow" : "milestone"
}

/** What a switch-off, a try or a Set of an item says first: its id with a capital, which the id as it stands or the name replaces. */
function leading(id: string): string {
	return id.charAt(0).toUpperCase() + id.slice(1)
}

/**
 * The change's label, with the name of the Account (or of the loan or asset group's Account) the ledger gives it, and
 * the `displayLabel` the plan's document states for a Flow or a Milestone. An item with no name keeps its id.
 */
export function labelWithNames(change: Change, names: ItemNames): string {
	if (change.kind === "group") {
		const name = change.path.slice(change.path.indexOf(":") + 1)
		return change.label.replace(` ${name} `, ` ${itemText(names, "account", name)} `)
	}
	const item = itemOf(change.path)
	if (item === null || !change.label.startsWith(leading(item.id))) return change.label
	const words = itemText(names, kindOf(item.list), item.id)
	return `${words}${change.label.slice(leading(item.id).length)}`
}
