/**
 * The one lookup that turns the id of a plan item into the words a page shows. Every name comes from what a `traj`
 * Read states and nothing else, so a name the CLI does not state is never made up (web ADR 0002, ADR 0029):
 *
 * - an Account is named by the ledger (`traj account list`), through the account names;
 * - a person is called by the role the household states ("You", "Your partner", "Child");
 * - a Flow and a Milestone have an id and no name in the CLI's output, so the page shows the id, in code.
 *
 * Pure: no figure is made here. `named` says which case a label is, so a component can set an id in code.
 */
import type { HouseholdDocument } from "../../contract"
import { type AccountNames, isNamed, nameOf } from "../account-names"
import { NO_PEOPLE, type PersonNames, personNames } from "./people"

/** What an id names: a Flow, an Account, a Milestone or a person of the household. */
export type ItemKind = "flow" | "account" | "milestone" | "person"

/** The names a page holds: the ledger's Account names and the household's people. */
export interface ItemNames {
	readonly accounts: AccountNames
	readonly people: PersonNames
}

/** The names of a page that has none: every id shows as it is. */
export const NO_ITEM_NAMES: ItemNames = { accounts: new Map(), people: NO_PEOPLE }

/** The lookup of a plan: the ledger's Account names and the people of that plan's household (null when it has none). */
export function itemNames(accounts: AccountNames, household: HouseholdDocument | null): ItemNames {
	return { accounts, people: personNames(household) }
}

/** What a page prints for an id: the words, and whether the CLI states them (an id that is not a name shows in code). */
export interface ItemLabel {
	readonly text: string
	readonly named: boolean
}

/** The label of an id: its name when a Read states one, else the id itself, marked as not named. */
export function itemLabel(names: ItemNames, kind: ItemKind, id: string): ItemLabel {
	if (kind === "account" && isNamed(names.accounts, id)) {
		return { text: nameOf(names.accounts, id), named: true }
	}
	const person = kind === "person" ? names.people.get(id) : undefined
	if (person !== undefined) return { text: person.label, named: true }
	return { text: id, named: false }
}

/** The words of an id as plain text, for a label that cannot hold markup (an option, an aria-label, a notice). */
export function itemText(names: ItemNames, kind: ItemKind, id: string): string {
	return itemLabel(names, kind, id).text
}
