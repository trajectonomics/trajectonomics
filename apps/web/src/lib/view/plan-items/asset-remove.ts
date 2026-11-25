/** Taking a real asset out of a plan: every item of it goes, and its Account stays when the ledger holds it. */
import { type ScenarioDocument, scenarioAccount } from "../../contract/scenario-show"
import { type AssetParts, flowsOf } from "./asset-parts"
import { withoutKeys } from "./form"
import { readsAccount } from "./loan-document"

/** The outcome of taking an asset out of a plan: the document, or the reason it is refused. */
export type AssetRemoval = { ok: true; document: ScenarioDocument } | { ok: false; message: string }

/**
 * The document without the asset: its Flows and its loan's debt go, and so does its Account, unless the
 * Baseline holds a balance in it (`baselineHolds`). A Baseline row whose Account the document does not declare
 * makes every read fail (UNDECLARED_BALANCE_ACCOUNT), so that Account stays declared, as an ordinary asset
 * that is accessible again. Another Flow whose derived amount reads the asset is refused by name, never left dangling.
 */
export function withoutAsset(
	doc: ScenarioDocument,
	parts: AssetParts,
	baselineHolds: boolean,
): AssetRemoval {
	const gone = new Set(flowsOf(parts).map((flow) => flow.id))
	const flows = doc.flows.filter((flow) => !gone.has(flow.id))
	const reader = flows.find((flow) => readsAccount(flow.derive, parts.account.id))
	if (reader !== undefined) {
		return {
			ok: false,
			message: `The Flow ${reader.id} reads ${parts.account.id} in its derived amount. Change or delete ${reader.id} first.`,
		}
	}
	const debt = parts.loan?.account.id
	const accounts = doc.accounts.flatMap((account) => {
		if (account.id === debt) return []
		if (account.id !== parts.account.id) return [account]
		return baselineHolds ? [scenarioAccount.parse(withoutKeys(account, ["liquid"]))] : []
	})
	return { ok: true, document: { ...doc, flows, accounts } }
}
