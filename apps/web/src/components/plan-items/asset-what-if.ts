/**
 * Tries a real asset's changes in the What-if session as one change: its Account, its loan's Account and each of its
 * Flows are Sets of their fields, so a changed price or sale date moves with the plan a Try saves. An item that is
 * added or taken out cannot be tried, so its label comes back for the form to name.
 */
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { GroupPart } from "../../client/what-if-groups.svelte.js"
import { type AssetParts, flowsOf } from "../../lib/view/plan-items/asset-parts"
import { recordOf } from "../../lib/what-if/session"

/** The part an item is, when it is on both sides: the stored item beside the edited one. */
function part(list: string, stored: { id: string }, edited: { id: string }): GroupPart {
	return { list, id: stored.id, stored: recordOf(stored), edited: recordOf(edited) }
}

/** The items the what-if could not try, by label: none when every change was tried. */
export function tryAssetInWhatIf(
	name: string,
	contentHash: string,
	stored: AssetParts,
	edited: AssetParts,
): string[] {
	const parts = [part("accounts", stored.account, edited.account)]
	// A loan on both sides: its terms are Sets of its Account, as the loan form tries them. A loan that is added or
	// taken out cannot be tried, so it is named.
	const loan = [] as string[]
	if (stored.loan !== null && edited.loan !== null) {
		parts.push(part("accounts", stored.loan.account, edited.loan.account))
	} else if ((stored.loan === null) !== (edited.loan === null)) loan.push("the loan")
	const editedFlows = flowsOf(edited)
	const storedFlows = flowsOf(stored)
	for (const flow of storedFlows) {
		const next = editedFlows.find((item) => item.id === flow.id)
		if (next !== undefined) parts.push(part("flows", flow, next))
	}
	const added = editedFlows.filter((flow) => !storedFlows.some((item) => item.id === flow.id))
	const removed = storedFlows.filter((flow) => !editedFlows.some((item) => item.id === flow.id))
	const spec = {
		kind: "asset",
		name: stored.account.id,
		paths: parts.map((one) => `${one.list}.${one.id}`),
	} as const
	const cleared = whatIfSession.tryGroup(name, contentHash, spec, parts)
	return [...cleared, ...loan, ...[...added, ...removed].map((flow) => flow.id)]
}
