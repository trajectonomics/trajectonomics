/** A real asset found in a document, and the edits that put its parts in or take them out (cli ADR 0060). Pure. */
import type { ScenarioAccount, ScenarioDocument } from "../../contract/scenario-show"
import { allAssetIds, assetIds } from "./asset-ids"
import { type AssetParts, flowsOf, isRealAsset, itemIdsOf, type RealAsset } from "./asset-parts"
import {
	loanOfAsset,
	monthly,
	onceCost,
	type Pick,
	payoffOf,
	purchaseOf,
	saleOf,
} from "./asset-recognise"
import { upsert } from "./document"

/** The real asset of an Account, with the items it recognises and the ids that follow its convention but not its shape. */
export function realAssetOf(doc: ScenarioDocument, account: ScenarioAccount): RealAsset {
	const ids = assetIds(account.id)
	const pick: Pick = (id) => doc.flows.find((flow) => flow.id === id)
	const purchase = purchaseOf(ids, pick)
	const sale = saleOf(ids, pick)
	const loan = loanOfAsset(doc, ids, purchase)
	const parts: AssetParts = {
		account,
		purchase,
		buyCost: onceCost(ids, pick, ids.buyCost, purchase?.start, false),
		loan,
		payoff: loan === null ? null : payoffOf(ids, pick, sale),
		running: monthly(ids, pick, ids.running, "expense"),
		rent: monthly(ids, pick, ids.rent, "income"),
		sale,
		saleCost:
			onceCost(ids, pick, ids.saleCost, sale?.start, false) ??
			onceCost(ids, pick, ids.saleCost, sale?.start, true),
	}
	const known = new Set(itemIdsOf(parts))
	const held = allAssetIds(account.id).filter(
		(id) => id !== account.id && (pick(id) !== undefined || doc.accounts.some((a) => a.id === id)),
	)
	return { parts, outside: held.filter((id) => !known.has(id)) }
}

/** Every real asset of a document, in the order the document holds their Accounts. */
export function realAssetsOf(doc: ScenarioDocument): RealAsset[] {
	return doc.accounts.filter(isRealAsset).map((account) => realAssetOf(doc, account))
}

/** The real asset of the Account with that id, or undefined. */
export function realAssetById(doc: ScenarioDocument, id: string): RealAsset | undefined {
	const account = doc.accounts.find((item) => item.id === id)
	return account !== undefined && isRealAsset(account) ? realAssetOf(doc, account) : undefined
}

/** The ids of the Flows and the loan Account that the real assets of a document group under their cards. */
export function groupedIds(doc: ScenarioDocument): Set<string> {
	return new Set(realAssetsOf(doc).flatMap((asset) => itemIdsOf(asset.parts)))
}

/** The document with the parts put in, and what the previous parts held that these do not taken out. */
export function assetDocument(
	doc: ScenarioDocument,
	parts: AssetParts,
	previous: AssetParts | undefined,
): ScenarioDocument {
	const next = new Set(itemIdsOf(parts))
	const dropped = new Set(previous === undefined ? [] : itemIdsOf(previous))
	for (const id of next) dropped.delete(id)
	const flows = doc.flows.filter((flow) => !dropped.has(flow.id))
	const accounts = doc.accounts.filter((account) => !dropped.has(account.id))
	const withAccounts = [parts.account, ...(parts.loan === null ? [] : [parts.loan.account])].reduce(
		(list, account) => upsert(list, account),
		accounts,
	)
	return {
		...doc,
		accounts: withAccounts,
		flows: flowsOf(parts).reduce((list, flow) => upsert(list, flow), flows),
	}
}
