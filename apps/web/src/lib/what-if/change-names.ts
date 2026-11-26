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

/** Whether a path's last field is a Milestone a Set names: `flows.gym.startAt` or `flows.gym.endAt`. */
function namesMilestone(path: string): boolean {
	const field = path.slice(path.lastIndexOf(".") + 1)
	return field === "startAt" || field === "endAt"
}

/** A Set of a Milestone field shows the Milestone's words in place of the id it stores. */
function milestoneValue(label: string, change: Change, names: ItemNames): string {
	if (change.kind !== "set" || !namesMilestone(change.path)) return label
	const tail = ` set to ${change.value}`
	if (!label.endsWith(tail)) return label
	const words = itemText(names, "milestone", change.value)
	return `${label.slice(0, label.length - tail.length)} set to ${words}`
}

/**
 * The change's label, with the name of the Account (or of the loan or asset group's Account) the ledger gives it, and
 * the `displayLabel` the plan's document states for a Flow or a Milestone. A `salary:` group names its salary's Flow in
 * place of the id. An item with no name keeps its id. A `startAt` or `endAt` Set shows the Milestone's name in place of
 * the id it stores.
 */
export function labelWithNames(change: Change, names: ItemNames): string {
	if (change.kind === "group" && change.path.startsWith("salary:")) {
		const id = change.path.slice("salary:".length)
		const leading = id.charAt(0).toUpperCase() + id.slice(1)
		return change.label.startsWith(leading)
			? `${itemText(names, "flow", id)}${change.label.slice(leading.length)}`
			: change.label
	}
	if (change.kind === "group") {
		const name = change.path.slice(change.path.indexOf(":") + 1)
		return change.label.replace(` ${name} `, ` ${itemText(names, "account", name)} `)
	}
	const item = itemOf(change.path)
	const named =
		item === null || !change.label.startsWith(leading(item.id))
			? change.label
			: `${itemText(names, kindOf(item.list), item.id)}${change.label.slice(leading(item.id).length)}`
	return milestoneValue(named, change, names)
}
