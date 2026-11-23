/**
 * The real asset a form's draft names, as the parts it saves (cli ADR 0060): the Account, and the Flows that
 * buy, finance, keep, rent out and sell it, under the ids of `asset-ids.ts`. The page does no money arithmetic: every
 * amount and rate stays the person's text, moved to the document by string handling, and `traj` computes the values.
 */
import type { ScenarioDocument } from "../../contract/scenario-show"
import { accountPart, loanPart } from "./asset-account"
import { buyCostFlow, purchaseFlow } from "./asset-build"
import { type AssetCheck, assetProblemsOf } from "./asset-check"
import type { AssetDraft } from "./asset-draft"
import { type AssetIds, assetIds, newAssetId } from "./asset-ids"
import { keepingFlow } from "./asset-keeping"
import type { AssetParts } from "./asset-parts"
import { payoffFlow, saleCostFlow, saleFlow } from "./asset-selling"
import { dayBefore } from "./date-before"
import { accountIds, flowIds } from "./document"
import { slugId } from "./form"
import type { Problems } from "./problems"

/** The outcome of an asset form: the parts to save, or the problems it shows at its fields. */
export type AssetResult = { ok: true; parts: AssetParts } | { ok: false; problems: Problems }

/** The Flows and the loan of a draft: each null when the draft states none, or when the schema would refuse it. */
type Items = Omit<AssetParts, "account">

/** The id the asset takes: the one it has, the Baseline's asset it attaches to, or one made from its name. */
function idOf(draft: AssetDraft, existing: AssetParts | undefined, doc: ScenarioDocument): string {
	if (existing !== undefined) return existing.account.id
	if (draft.ownership === "owned") return draft.ownedAccount
	return newAssetId(slugId(draft.name), [...accountIds(doc), ...flowIds(doc)])
}

/** The items a draft states, each over the item it replaces (`old`) so a field the form does not show is kept. */
function itemsOf(draft: AssetDraft, ids: AssetIds, old: AssetParts | undefined): Items {
	const buying = draft.ownership === "buy"
	const end = draft.selling === "date" ? dayBefore(draft.saleDate.trim()) : null
	const start = buying ? draft.purchaseDate.trim() : draft.from.trim()
	const keep = (kind: "expense" | "income", key: "running" | "rent") =>
		keepingFlow(kind, draft, {
			id: ids[key],
			account: ids.account,
			start,
			end,
			old: old?.[key] ?? null,
		})
	return {
		purchase: buying ? purchaseFlow(draft, ids, old?.purchase ?? null) : null,
		buyCost: buying ? buyCostFlow(draft, ids, old?.buyCost ?? null) : null,
		loan: loanPart(draft, ids, old?.loan ?? null, end),
		payoff: payoffFlow(draft, ids, old?.payoff ?? null),
		running: keep("expense", "running"),
		rent: keep("income", "rent"),
		sale: saleFlow(draft, ids, old?.sale ?? null),
		saleCost: saleCostFlow(draft, ids, old?.saleCost ?? null),
	}
}

/** Whether every item the draft states was built: a part the schema refused is lost, and the save is refused. */
function complete(draft: AssetDraft, items: Items): boolean {
	const buying = draft.ownership === "buy"
	const selling = draft.selling === "date"
	const stated: [boolean, unknown][] = [
		[buying, items.purchase],
		[buying && draft.buyCost.trim() !== "", items.buyCost],
		[buying && draft.paying === "loan", items.loan],
		[draft.running.mode !== "none", items.running],
		[draft.rent.mode !== "none", items.rent],
		[selling, items.sale],
		[selling && draft.saleCost.mode !== "none", items.saleCost],
		[selling && buying && draft.paying === "loan", items.payoff],
	]
	return stated.every(([wanted, item]) => !wanted || item !== null)
}

/**
 * The asset a draft names. A new asset's ids are made from its name, or are the Baseline asset's own; an
 * existing one keeps its ids and the fields the form does not show. The checks are shape checks: `traj` refuses
 * what it cannot accept.
 */
export function assetFromDraft(
	draft: AssetDraft,
	options: { existing?: AssetParts | undefined; doc: ScenarioDocument; check: AssetCheck },
): AssetResult {
	const { existing, doc } = options
	const problems = assetProblemsOf(draft, options.check)
	if (problems.size > 0) return { ok: false, problems: Object.fromEntries(problems) }
	const id = idOf(draft, existing, doc)
	const base = existing?.account ?? doc.accounts.find((account) => account.id === id)
	const account = accountPart(draft, id, base)
	const items = itemsOf(draft, assetIds(id), existing)
	if (account === null || !complete(draft, items)) {
		return { ok: false, problems: { general: "The asset cannot be saved as it is." } }
	}
	return { ok: true, parts: { account, ...items } }
}
