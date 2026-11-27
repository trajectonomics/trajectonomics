import type { ScenarioDocument, ScenarioFlow } from "../../contract"
import type { FlowKind } from "./flows"

/**
 * Why a new income Flow in a taxed plan needs a tax label, or null when the form needs no notice. A Levy counts only the
 * income whose label it knows, and the form cannot set one, so a new income would be untaxed without a word. The value is
 * the Tax labels page for the plan, where the person gives the saved income its label.
 */
export function newIncomeTaxNote(
	plan: string,
	doc: ScenarioDocument,
	kind: FlowKind,
	existing: ScenarioFlow | undefined,
): string | null {
	if (kind !== "income" || existing !== undefined || (doc.levies?.length ?? 0) === 0) return null
	return `/settings/tax/?scenario=${encodeURIComponent(plan)}`
}
