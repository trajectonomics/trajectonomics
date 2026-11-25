/**
 * The Accounts the routing drawers offer. Names come from the accounts Read (`accountNames`); an id the Read does not
 * know stays as it is. An asset marked `liquid: false` (a home, a car) is never offered to a step, a floor or a
 * transfer's source: the plan cannot draw on it, and the engine refuses it (sim ADR 0019, 0030, 0031).
 */
import type { ScenarioDocument } from "../../contract"
import { type AccountNames, nameOf } from "../account-names"

/** One Account a select offers: the id the document holds and the name the person reads. */
export interface AccountChoice {
	readonly id: string
	readonly name: string
}

/** The sentence that says why an illiquid asset is not in the list. */
export const ILLIQUID_NOTE =
	"Assets you cannot draw on, such as a home or a car, are never offered: the plan cannot take money from them, so it never routes money through them."

/** The liquid assets of the plan, in the document's order. */
export function routableAccounts(doc: ScenarioDocument, names: AccountNames): AccountChoice[] {
	return doc.accounts
		.filter((account) => account.kind === "asset" && account.liquid !== false)
		.map((account) => ({ id: account.id, name: nameOf(names, account.id) }))
}

/** Every asset and every loan except `source`: a transfer may land in an illiquid asset or pay a loan down. */
export function transferTargets(
	doc: ScenarioDocument,
	names: AccountNames,
	source: string,
): AccountChoice[] {
	return doc.accounts
		.filter((account) => account.id !== source)
		.map((account) => ({ id: account.id, name: nameOf(names, account.id) }))
}

/** Whether the plan holds an asset that is not offered, so a section says why. */
export function hasIlliquid(doc: ScenarioDocument): boolean {
	return doc.accounts.some((account) => account.kind === "asset" && account.liquid === false)
}

/** One option of an account select. */
export interface AccountOption {
	readonly value: string
	readonly label: string
}

/**
 * The options of a select of Accounts: a first that chooses none, then the choices. An Account the document already names
 * but the list does not offer (an illiquid asset a hand-written plan routes) stays, so the form shows what is stored.
 */
export function accountOptions(
	choices: readonly AccountChoice[],
	current: string,
	names: AccountNames,
	none: string,
): AccountOption[] {
	const options = choices.map((one) => ({ value: one.id, label: one.name }))
	const held = current === "" || options.some((one) => one.value === current)
	return [
		{ value: "", label: none },
		...(held ? [] : [{ value: current, label: nameOf(names, current) }]),
		...options,
	]
}
