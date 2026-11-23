/** The form's text for a real asset to edit, read back from its parts (cli ADR 0060). */
import type { ScenarioFlow } from "../../contract/scenario-show"
import { formatBps } from "../../format/bps"
import { type AmountDraft, type AssetDraft, NO_AMOUNT, newAssetDraft } from "./asset-draft"
import type { AssetParts } from "./asset-parts"
import { shareOf } from "./asset-shape"
import { type LoanDraft, loanDraftOf } from "./loan-draft"

/** The growth a fixed Flow states, as the form's text. */
function growthOf(flow: ScenarioFlow): Pick<AmountDraft, "growth" | "growthRate"> {
	const growth = flow.growth
	if (growth === undefined || growth === "inflation") return { growth: "inflation", growthRate: "" }
	return { growth: "fixed", growthRate: formatBps(growth.bps) }
}

/** The draft of a Flow of the asset: fixed (an amount and its growth) or a share of the value, or none. */
function amountDraftOf(flow: ScenarioFlow | null, account: string): AmountDraft {
	if (flow === null) return NO_AMOUNT
	const share = shareOf(flow, account)
	if (share !== null) return { ...NO_AMOUNT, mode: "percent", rate: formatBps(share.num) }
	return { ...NO_AMOUNT, mode: "amount", amount: flow.amount ?? "", ...growthOf(flow) }
}

/** The rounding the first computed amount states, or "" when none is computed. */
function roundingOf(parts: AssetParts): string {
	const flows = [parts.running, parts.rent, parts.saleCost]
	for (const flow of flows) {
		const share = flow === null ? null : shareOf(flow, parts.account.id)
		if (share !== null) return share.rounding
	}
	return ""
}

/** The text of the asset's own fields: its name, ownership and the change in its value. */
function basicsOf(parts: AssetParts): Partial<AssetDraft> {
	const rate = parts.account.rate
	const first = parts.running ?? parts.rent
	const owned = parts.purchase === null
	return {
		name: parts.account.id,
		ownership: owned ? "owned" : "buy",
		ownedAccount: owned ? parts.account.id : "",
		direction: rate < 0 ? "fall" : "rise",
		valueRate: formatBps(Math.abs(rate)),
		from: owned ? (first?.start ?? "") : "",
	}
}

/** The text of how it was bought: its date, price, costs and loan. */
function buyingOf(parts: AssetParts): Partial<AssetDraft> {
	const loan: LoanDraft | null = parts.loan === null ? null : loanDraftOf(parts.loan)
	return {
		purchaseDate: parts.purchase?.start ?? "",
		price: parts.purchase?.amount ?? "",
		buyCost: parts.buyCost?.amount ?? "",
		paying: loan === null ? "savings" : "loan",
		...(loan === null ? {} : { loan }),
	}
}

/** The form's text for an asset to edit. Its value's change is the Account's stated `rate`. */
export function assetDraftOf(parts: AssetParts): AssetDraft {
	const id = parts.account.id
	return {
		...newAssetDraft(),
		...basicsOf(parts),
		...buyingOf(parts),
		running: amountDraftOf(parts.running, id),
		rounding: roundingOf(parts),
		category: parts.running?.category ?? "",
		rent: amountDraftOf(parts.rent, id),
		selling: parts.sale === null ? "none" : "date",
		saleDate: parts.sale?.start ?? "",
		saleCost: amountDraftOf(parts.saleCost, id),
	}
}
