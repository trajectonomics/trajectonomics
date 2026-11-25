/** The Flows a real-asset form saves, built from its draft. An existing item keeps the fields the form does not show. */
import { type ScenarioFlow, scenarioFlow } from "../../contract/scenario-show"
import { parseBps } from "../../format/bps"
import type { AmountDraft, AssetDraft } from "./asset-draft"
import type { AssetIds } from "./asset-ids"
import { shareDeriveOf } from "./asset-shape"
import { typedAmount, withoutKeys } from "./form"

/** The fields of a Flow the form states, which a rebuilt Flow takes from the draft and not from its old self. */
const STATED = [
	"amount",
	"growth",
	"derive",
	"start",
	"end",
	"frequency",
	"earned",
	"category",
	"level",
	"target",
	"source",
	"funding",
]

/** The Flow of these fields over the item it replaces, or null when the schema would refuse it. */
export function flowFrom(
	existing: ScenarioFlow | null | undefined,
	fields: Record<string, unknown>,
): ScenarioFlow | null {
	const parsed = scenarioFlow.safeParse({ ...withoutKeys(existing ?? {}, STATED), ...fields })
	return parsed.success ? parsed.data : null
}

/** The share of the value a percent draft names, over `den`: the basis points of the percent, moved by text. */
export function shareFields(draft: AmountDraft, rounding: string, den: number, account: string) {
	return { derive: shareDeriveOf(account, { num: parseBps(draft.rate) ?? 0, den, rounding }) }
}

/** The purchase: an obligation Contribution paid in full on its date. */
export function purchaseFlow(
	draft: AssetDraft,
	ids: AssetIds,
	old: ScenarioFlow | null,
): ScenarioFlow | null {
	return flowFrom(old, {
		id: old?.id ?? ids.purchase,
		kind: "contribution",
		target: ids.account,
		funding: "obligation",
		frequency: "once",
		start: draft.purchaseDate.trim(),
		amount: typedAmount(draft.price),
		growth: { bps: 0 },
	})
}

/** The costs of buying, one expense on the purchase date; null when none are stated. */
export function buyCostFlow(
	draft: AssetDraft,
	ids: AssetIds,
	old: ScenarioFlow | null,
): ScenarioFlow | null {
	if (draft.buyCost.trim() === "") return null
	return flowFrom(old, {
		id: old?.id ?? ids.buyCost,
		kind: "expense",
		frequency: "once",
		start: draft.purchaseDate.trim(),
		amount: typedAmount(draft.buyCost),
		growth: { bps: 0 },
	})
}
