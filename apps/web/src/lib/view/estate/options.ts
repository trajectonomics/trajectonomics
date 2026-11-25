/** The choices of the estate form's selects, with the words the person reads. No choice is made for them. */
import type { ScenarioDocument } from "../../contract"
import { type AccountNames, nameOf } from "../account-names"
import type { Choice } from "../plan-items/options"

/** How a line is set: a share of a base, or a fixed amount. */
export const HOW_CHOICES: readonly Choice[] = [
	{ value: "", label: "Choose how it is set" },
	{ value: "share", label: "A share" },
	{ value: "fixed", label: "A fixed amount" },
]

/** What a cost's share is of. A gift's share is always of what is left, so it has no choice. */
export const OF_CHOICES: readonly Choice[] = [
	{ value: "", label: "Choose what it is a share of" },
	{ value: "gross", label: "Everything owned" },
	{ value: "accounts", label: "Chosen Accounts" },
]

/** One Account a cost's share may be taken from: its id and the name the person knows it by. */
export interface AccountChoice {
	readonly id: string
	readonly label: string
}

/** The asset Accounts of the plan, a home included; a liability is never offered, because `traj` refuses it as a base. */
export function accountChoices(doc: ScenarioDocument, names: AccountNames): AccountChoice[] {
	return doc.accounts
		.filter((account) => account.kind === "asset")
		.map((account) => ({ id: account.id, label: nameOf(names, account.id) }))
}
