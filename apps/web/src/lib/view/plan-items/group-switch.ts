/**
 * The What-if switch of a loan and of a real asset (cli ADR 0059, 0060): each is one group, so its parts leave the
 * plan together or not at all. A part alone would leave the plan inconsistent: a loan left owing for good once its
 * payoff is off, a loan drawn as cash once its purchase is off. The rule is the one deleting it follows
 * (`withoutLoan`, `withoutAsset`): every Flow of the item goes, and so does its debt. The Account of an asset the
 * Baseline holds a balance in stays declared, because a Baseline row whose Account the plan does not declare makes
 * every read fail. A debt the Baseline holds, or one another Flow reads, has no switch: a what-if cannot erase a
 * debt the ledger holds, and a loan whose parts an asset's group claims follows that asset's switch. At most one
 * group claims a path. Pure: it reads ids, and no amount.
 */
import type { ScenarioDocument } from "../../contract/scenario-show"
import type { GroupSpec } from "../../what-if/session-group"
import { realAssetsOf } from "./asset-document"
import { type AssetParts, flowsOf } from "./asset-parts"
import { withoutAsset } from "./asset-remove"
import { type LoanParts, withoutLoan } from "./loan-document"

/** A group and the paths its switch takes out of the plan; the rest of its paths stay declared. */
export interface GroupSwitch {
	readonly spec: GroupSpec
	readonly removals: readonly string[]
	/** Why the card has no switch, in words, or null when it has one. A Try of its terms stays. */
	readonly refused: string | null
	/** The asset whose group holds the loan's parts, or null: the loan then follows that asset's switch. */
	readonly owner: GroupSpec | null
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

const OWED =
	"Already owed: the ledger holds this debt, so a what-if cannot take it out. Try its terms instead."
const OWED_ASSET =
	"Already owed: the ledger holds this asset's loan, so a what-if cannot take the asset out. Try its values instead."
const CANNOT = "A what-if cannot take it out. "

/** The group, its removals (every part but an Account the Baseline holds) and why it has no switch, if so. */
function switchOf(
	spec: GroupSpec,
	accounts: readonly string[],
	held: Held,
	refused: string | null,
): GroupSwitch {
	const kept = accounts.filter(held).map((id) => `accounts.${id}`)
	return { spec, removals: spec.paths.filter((path) => !kept.includes(path)), refused, owner: null }
}

/** The asset whose group holds one of the loan's parts, when the terminal changed the loan so that the asset does not recognise it. */
function ownerOf(doc: ScenarioDocument, loan: LoanParts, held: Held): GroupSpec | null {
	const own = loanPaths(doc, loan)
	const specs = realAssetsOf(doc).map((asset) => assetSwitch(doc, asset, held).spec)
	return specs.find((spec) => spec.paths.some((path) => own.includes(path))) ?? null
}

/**
 * The switch of a loan: its Flows and its debt. A debt the Baseline holds has no switch, since taking its payments
 * out leaves it growing; neither has one another Flow reads, nor a loan whose parts an asset's group claims.
 */
export function loanSwitch(doc: ScenarioDocument, loan: LoanParts, held: Held): GroupSwitch {
	const id = loan.account.id
	const spec: GroupSpec = { kind: "loan", name: id, paths: loanPaths(doc, loan) }
	const owner = ownerOf(doc, loan, held)
	const removal = withoutLoan(doc, id, false)
	let refused: string | null = null
	if (held(id)) refused = OWED
	else if (owner !== null) refused = `Part of asset ${owner.name}: it switches with the asset.`
	else if (!removal.ok) refused = CANNOT + removal.message
	return { ...switchOf(spec, [id], held, refused), owner }
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
	const removal = withoutAsset(doc, parts, held(parts.account.id))
	let refused: string | null = null
	if (debt.some(held)) refused = OWED_ASSET
	else if (!removal.ok) refused = CANNOT + removal.message
	return switchOf(spec, [parts.account.id, ...debt], held, refused)
}
