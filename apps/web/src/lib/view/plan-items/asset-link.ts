import type { HouseholdDocument, ScenarioDocument } from "../../contract"
import { flowAnchorLabels } from "../household/model"
import { withSearch } from "../links"
import { realAssetsOf } from "./asset-document"
import { assetIds } from "./asset-ids"
import { flowsOf } from "./asset-parts"

/** The link to the Assets and debts page for a plan, where a real asset's items are. Keeps the other parameters. */
export function assetsHref(scenario: string, search: string): string {
	const params = new URLSearchParams(search)
	params.set("scenario", scenario)
	return withSearch("/assets-and-debts/", params.toString())
}

/**
 * The ids of the real assets that have items of a kind, so an Income or Expenses page can say where they went:
 * the asset's rent is income, and its running and buying and selling costs are expenses.
 */
export function assetsWithFlows(doc: ScenarioDocument, kind: "income" | "expense"): string[] {
	return realAssetsOf(doc)
		.filter((asset) => flowsOf(asset.parts).some((flow) => flow.kind === kind))
		.map((asset) => asset.parts.account.id)
}

/** The household's labels of an asset's purchase and sale dates, or null where it pins none. */
export function assetAnchors(
	household: HouseholdDocument | null,
	id: string,
): { purchase: string | null; sale: string | null } {
	const ids = assetIds(id)
	return {
		purchase: flowAnchorLabels(household, ids.purchase).start,
		sale: flowAnchorLabels(household, ids.sale).start,
	}
}
