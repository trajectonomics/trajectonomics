/** What a real-asset form does with its draft on Save: refuse it at its fields, try it in the What-if, or save it. */
import type { ScenarioDocument } from "../../lib/contract"
import { assetDocument } from "../../lib/view/plan-items/asset-document"
import type { AssetDraft } from "../../lib/view/plan-items/asset-draft"
import { assetFromDraft } from "../../lib/view/plan-items/asset-from-draft"
import type { OwnedChoice } from "../../lib/view/plan-items/asset-owned"
import type { AssetParts } from "../../lib/view/plan-items/asset-parts"
import { withoutAsset } from "../../lib/view/plan-items/asset-remove"
import type { Problems } from "../../lib/view/plan-items/problems"
import { tryAssetInWhatIf } from "./asset-what-if"

/** The outcome of a Save: the problems to show, the items a Try could not hold, or the document to send. */
export type Submitted =
	| { readonly kind: "problems"; readonly problems: Problems }
	| { readonly kind: "tried"; readonly cleared: string[] }
	| {
			readonly kind: "save"
			readonly document: ScenarioDocument
			readonly id: string
			readonly owned: boolean
	  }

/** What a Save needs besides the draft: the plan, what the asset was, and whether this is a Try. */
export interface Submission {
	readonly name: string
	readonly contentHash: string
	readonly doc: ScenarioDocument
	readonly existing: AssetParts | undefined
	readonly choices: readonly OwnedChoice[]
	readonly tryValue: boolean
}

/** The asset a Save names, and what to do with it. */
export function submitAsset(draft: AssetDraft, submission: Submission): Submitted {
	const { existing, doc } = submission
	const ownedIds = [
		...submission.choices.map((choice) => choice.id),
		...(existing ? [existing.account.id] : []),
	]
	const result = assetFromDraft(draft, {
		existing,
		doc,
		check: { isNew: existing === undefined, ownedIds },
	})
	if (!result.ok) return { kind: "problems", problems: result.problems }
	if (submission.tryValue) {
		const cleared =
			existing === undefined
				? []
				: tryAssetInWhatIf(submission.name, submission.contentHash, existing, result.parts)
		return { kind: "tried", cleared }
	}
	const document = assetDocument(doc, result.parts, existing)
	return {
		kind: "save",
		document,
		id: result.parts.account.id,
		owned: result.parts.purchase === null,
	}
}

/** The asset taken out of the plan, or the reason it cannot be: nothing is sent when it is refused. */
export function removeAsset(
	doc: ScenarioDocument,
	existing: AssetParts | undefined,
	held: boolean,
): Submitted {
	const removal = existing === undefined ? null : withoutAsset(doc, existing, held)
	if (existing === undefined || removal === null || !removal.ok) {
		const message = removal?.ok === false ? removal.message : "There is no asset to delete."
		return { kind: "problems", problems: { general: message } }
	}
	return {
		kind: "save",
		document: removal.document,
		id: existing.account.id,
		owned: existing.purchase === null,
	}
}
