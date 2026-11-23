/**
 * The What-if switch of a loan and of a real asset (cli ADR 0059, 0060): each is one group, so its parts leave the
 * plan together or not at all. A part alone would leave the plan inconsistent: a loan left owing for good once its
 * payoff is off, a loan drawn as cash once its purchase is off. The rule is the one deleting it follows
 * (`withoutLoan`, `withoutAsset`): every Flow of the item goes, and so does its debt, and the Account the Baseline
 * holds a balance in stays declared, because a Baseline row whose Account the plan does not declare makes every
 * read fail. Pure: it reads ids, and no amount.
 */
import type { ScenarioDocument } from "../../contract/scenario-show"
import type { GroupSpec } from "../../what-if/session-group"
import { type AssetParts, flowsOf } from "./asset-parts"
import type { LoanParts } from "./loan-document"

/** A group and the paths its switch takes out of the plan; the rest of its paths stay declared. */
export interface GroupSwitch {
	readonly spec: GroupSpec
	readonly removals: readonly string[]
}

/** The ids of the Flows that pay into or borrow from an Account, extra payments included. */
function flowsTouching(doc: ScenarioDocument, account: string): string[] {
	return doc.flows
		.filter((flow) => flow.target === account || flow.source === account)
		.map((flow) => flow.id)
}

/** The paths of a loan's parts: its Account and every Flow that pays or borrows it. */
export function loanPaths(doc: ScenarioDocument, loan: LoanParts): string[] {
	const ids = new Set([loan.payment.id, ...(loan.draw === null ? [] : [loan.draw.id])])
	for (const id of flowsTouching(doc, loan.account.id)) ids.add(id)
	return [`accounts.${loan.account.id}`, ...[...ids].map((id) => `flows.${id}`)]
}

/**
 * The paths of an asset's parts: its Account, its loan's debt and every Flow, with the Flows of that debt, and the
 * items named as the asset's that were changed outside the form (`outside`), which leave with it.
 */
export function assetPaths(
	doc: ScenarioDocument,
	parts: AssetParts,
	outside: readonly string[],
): string[] {
	const ids = new Set([...flowsOf(parts).map((flow) => flow.id), ...outside])
	const debt = parts.loan?.account.id
	if (debt !== undefined) for (const id of flowsTouching(doc, debt)) ids.add(id)
	const flows = [...ids].filter((id) => doc.flows.some((flow) => flow.id === id))
	const accounts = outside.filter((id) => doc.accounts.some((account) => account.id === id))
	return [
		`accounts.${parts.account.id}`,
		...(debt === undefined ? [] : [`accounts.${debt}`]),
		...accounts.map((id) => `accounts.${id}`),
		...flows.map((id) => `flows.${id}`),
	]
}

/** Whether the Baseline holds a balance in the Account of that id, which then stays declared. */
export type Held = (account: string) => boolean

/** The group to switch: all its paths, and its removals, without the Accounts the Baseline holds. */
function switchOf(spec: GroupSpec, accounts: readonly string[], held: Held): GroupSwitch {
	const kept = accounts.filter(held).map((id) => `accounts.${id}`)
	return { spec, removals: spec.paths.filter((path) => !kept.includes(path)) }
}

/** The switch of a loan: its Flows and its debt, and the debt stays declared when the Baseline holds a balance in it. */
export function loanSwitch(doc: ScenarioDocument, loan: LoanParts, held: Held): GroupSwitch {
	const spec: GroupSpec = { kind: "loan", name: loan.account.id, paths: loanPaths(doc, loan) }
	return switchOf(spec, [loan.account.id], held)
}

/** The switch of a real asset: its Flows and its loan's debt, and an Account the Baseline holds stays declared. */
export function assetSwitch(
	doc: ScenarioDocument,
	asset: { parts: AssetParts; outside: readonly string[] },
	held: Held,
): GroupSwitch {
	const { parts, outside } = asset
	const spec: GroupSpec = {
		kind: "asset",
		name: parts.account.id,
		paths: assetPaths(doc, parts, outside),
	}
	const debt = parts.loan === null ? [] : [parts.loan.account.id]
	return switchOf(spec, [parts.account.id, ...debt], held)
}
