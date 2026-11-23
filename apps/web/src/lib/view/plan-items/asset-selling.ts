/** The sale of a real asset and what it sets off (cli ADR 0060): the sale itself, its costs, and the loan's repayment. */
import type { ScenarioFlow } from "../../contract/scenario-show"
import { flowFrom, shareFields } from "./asset-build"
import type { AssetDraft } from "./asset-draft"
import type { AssetIds } from "./asset-ids"
import { ONCE_DEN, wholeDeriveOf } from "./asset-shape"
import { typedAmount } from "./form"

/** The sale: a withdrawal of the asset's whole value on its date. */
export function saleFlow(
	draft: AssetDraft,
	ids: AssetIds,
	old: ScenarioFlow | null,
): ScenarioFlow | null {
	if (draft.selling !== "date") return null
	return flowFrom(old, {
		id: old?.id ?? ids.sale,
		kind: "withdrawal",
		source: ids.account,
		frequency: "once",
		start: draft.saleDate.trim(),
		derive: wholeDeriveOf(ids.account),
	})
}

/** The costs of selling, one expense on the sale date: a share of the value, or an amount. */
export function saleCostFlow(
	draft: AssetDraft,
	ids: AssetIds,
	old: ScenarioFlow | null,
): ScenarioFlow | null {
	const cost = draft.saleCost
	if (draft.selling !== "date" || cost.mode === "none") return null
	const amount =
		cost.mode === "percent"
			? shareFields(cost, draft.rounding, ONCE_DEN, ids.account)
			: { amount: typedAmount(cost.amount), growth: { bps: 0 } }
	return flowFrom(old, {
		id: old?.id ?? ids.saleCost,
		kind: "expense",
		frequency: "once",
		start: draft.saleDate.trim(),
		...amount,
	})
}

/** The repayment of what the loan still owes from the sale, which reads the asset and not the loan. */
export function payoffFlow(
	draft: AssetDraft,
	ids: AssetIds,
	old: ScenarioFlow | null,
): ScenarioFlow | null {
	if (draft.selling !== "date" || draft.paying !== "loan" || draft.ownership !== "buy") return null
	return flowFrom(old, {
		id: old?.id ?? ids.loanPayoff,
		kind: "contribution",
		target: ids.loan,
		frequency: "once",
		start: draft.saleDate.trim(),
		derive: wholeDeriveOf(ids.account),
	})
}
