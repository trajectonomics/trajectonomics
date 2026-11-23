import type { ScenarioDocument } from "../../contract"
import { type AssetCheck, assetProblemsOf } from "./asset-check"
import { assetDocument } from "./asset-document"
import type { AssetDraft } from "./asset-draft"
import { newAssetDraft } from "./asset-draft"
import { type AssetResult, assetFromDraft } from "./asset-from-draft"
import type { AssetParts } from "./asset-parts"
import { planDocument } from "./fixtures.test-support"

/** A home the person typed: bought on 15 July 2027 for 1500000.00 with a loan, kept, let and sold on 15 July 2030. */
export function homeDraft(overrides: Partial<AssetDraft> = {}): AssetDraft {
	return {
		...newAssetDraft(),
		name: "Home",
		direction: "rise",
		valueRate: "3.00",
		purchaseDate: "2027-07-15",
		price: "1500000.00",
		buyCost: "20000.00",
		paying: "loan",
		loan: {
			name: "",
			principal: "1200000.00",
			rate: "5.00",
			compounding: "monthly",
			payments: "180",
			firstPayment: "2027-08-15",
			rounding: "ceil",
			arrival: "date",
			arrivalDate: "",
			owedAccount: "",
		},
		running: { mode: "percent", rate: "1.00", amount: "", growth: "inflation", growthRate: "" },
		rounding: "halfUp",
		category: "housing",
		rent: { mode: "amount", rate: "", amount: "8000.00", growth: "fixed", growthRate: "2.00" },
		selling: "date",
		saleDate: "2030-07-15",
		saleCost: { mode: "percent", rate: "3.00", amount: "", growth: "inflation", growthRate: "" },
		...overrides,
	}
}

const CHECK: AssetCheck = { isNew: true, ownedIds: [] }

/** The parts a draft saves as, in the plan fixture; throws with the problems when the draft is refused. */
export function partsOf(
	draft: AssetDraft,
	doc: ScenarioDocument = planDocument(),
	check: AssetCheck = CHECK,
): AssetParts {
	const result: AssetResult = assetFromDraft(draft, { doc, check })
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.parts
}

/** The plan fixture with the draft's asset saved in it. */
export function planWithHome(draft: AssetDraft = homeDraft()): ScenarioDocument {
	const doc = planDocument()
	return assetDocument(doc, partsOf(draft, doc), undefined)
}

export { assetProblemsOf, CHECK }
