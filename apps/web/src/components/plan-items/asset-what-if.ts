/**
 * Tries a real asset's changes in the What-if session: its Account and each of its Flows are Sets of their
 * fields, so a changed price or sale date moves with the plan a Try saves. An item that is added or taken out cannot
 * be tried, so its label comes back for the form to name.
 */
import { whatIfSession } from "../../client/what-if.svelte.js"
import { type AssetParts, flowsOf } from "../../lib/view/plan-items/asset-parts"
import { recordOf } from "../../lib/what-if/session"

/** The items the what-if could not try, by label: none when every change was tried. */
export function tryAssetInWhatIf(
	name: string,
	contentHash: string,
	stored: AssetParts,
	edited: AssetParts,
): string[] {
	const tried = [
		whatIfSession.tryItem(
			name,
			contentHash,
			"accounts",
			stored.account.id,
			recordOf(stored.account),
			recordOf(edited.account),
		),
	]
	const editedFlows = flowsOf(edited)
	const storedFlows = flowsOf(stored)
	for (const flow of storedFlows) {
		const next = editedFlows.find((item) => item.id === flow.id)
		if (next !== undefined) {
			tried.push(
				whatIfSession.tryItem(name, contentHash, "flows", flow.id, recordOf(flow), recordOf(next)),
			)
		}
	}
	const added = editedFlows.filter((flow) => !storedFlows.some((item) => item.id === flow.id))
	const removed = storedFlows.filter((flow) => !editedFlows.some((item) => item.id === flow.id))
	return [...tried.flat(), ...[...added, ...removed].map((flow) => flow.id)]
}
