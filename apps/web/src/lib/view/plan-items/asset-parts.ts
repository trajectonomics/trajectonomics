/** The parts of a real asset (cli ADR 0060): the Account and the items that buy, finance, keep, rent out and sell it. */
import type { ScenarioAccount, ScenarioFlow } from "../../contract/scenario-show"
import type { LoanParts } from "./loan-document"

/** The items of one real asset, each null when the asset has none of it. */
export interface AssetParts {
	readonly account: ScenarioAccount
	readonly purchase: ScenarioFlow | null
	readonly buyCost: ScenarioFlow | null
	readonly loan: LoanParts | null
	readonly payoff: ScenarioFlow | null
	readonly running: ScenarioFlow | null
	readonly rent: ScenarioFlow | null
	readonly sale: ScenarioFlow | null
	readonly saleCost: ScenarioFlow | null
}

/** A real asset found in a document: its parts, and the ids that follow its convention but not its shape. */
export interface RealAsset {
	readonly parts: AssetParts
	/** The ids of items that are named as the asset's but were changed outside the form: shown as ordinary items. */
	readonly outside: readonly string[]
}

/** Whether an Account is a real asset: an asset that is not liquid, so it stays out of accessible net worth. */
export function isRealAsset(account: ScenarioAccount): boolean {
	return account.kind === "asset" && account.liquid === false
}

/** The Flows of the parts, in the order a card lists them. */
export function flowsOf(parts: AssetParts): ScenarioFlow[] {
	const list = [
		parts.purchase,
		parts.buyCost,
		parts.loan?.draw ?? null,
		parts.loan?.payment ?? null,
		parts.running,
		parts.rent,
		parts.sale,
		parts.saleCost,
		parts.payoff,
	]
	return list.flatMap((flow) => (flow === null ? [] : [flow]))
}

/** The ids of every item the parts hold, the Account first and the loan's liability beside its Flows. */
export function itemIdsOf(parts: AssetParts): string[] {
	const loan = parts.loan === null ? [] : [parts.loan.account.id]
	return [parts.account.id, ...loan, ...flowsOf(parts).map((flow) => flow.id)]
}
