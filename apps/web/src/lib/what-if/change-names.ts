/** A change's label with the ledger's name in place of an Account's id. Pure; a label that names no Account is as it was. */
import { type AccountNames, nameOf } from "../view/account-names"
import type { Change } from "./session-changes"

/** The id of the Account a path names (`accounts.fund.rate`), or null for any other path. */
function accountOf(path: string): string | null {
	const [list, id] = path.split(".")
	return list === "accounts" && id !== undefined ? id : null
}

/** What a switch-off, a try or a Set of an Account says first: its id with a capital, which the name replaces. */
function leading(id: string): string {
	return id.charAt(0).toUpperCase() + id.slice(1)
}

/** The change's label, with the name of the Account (or of the loan or asset group's Account) the ledger gives it. */
export function labelWithNames(change: Change, names: AccountNames): string {
	if (change.kind === "group") {
		const name = change.path.slice(change.path.indexOf(":") + 1)
		return change.label.replace(` ${name} `, ` ${nameOf(names, name)} `)
	}
	const id = accountOf(change.path)
	if (id === null || !change.label.startsWith(leading(id))) return change.label
	return `${nameOf(names, id)}${change.label.slice(leading(id).length)}`
}
