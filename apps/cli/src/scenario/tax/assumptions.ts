import type { ThAssumptionLevy } from "@trajectonomics/core/tax/th"
import { thLevyAssumptionsForLabels } from "@trajectonomics/core/tax/th"
import { type AssumptionView, assumptionViews } from "../../tax-assumptions"
import type { ScenarioDocument } from "../document"
import { withCeilingNotes } from "./ceiling-notes"
import { flowsOf } from "./labels"
import { taxLeviesOf } from "./levy-ids"

/**
 * The tax figures the Levies this write stored would use whose source is not yet confirmed, read
 * from the Levies' own measures and the labels the document's Flows carry (ADR-0042). A figure is
 * named once however many Returns use it. A write has no period to evaluate, so a label counts as
 * used when any Flow carries it; a Projection says which tax years actually used a figure.
 * `ceilingNotes` are what the write says on the home-loan ceiling (`ceiling-notes.ts`).
 */
export function taxAssumptionsOf(
	document: ScenarioDocument,
	ceilingNotes: readonly string[] = [],
): AssumptionView[] {
	const labels = new Set<string>()
	for (const flow of flowsOf(document)) {
		if (typeof flow["label"] === "string") labels.add(flow["label"])
	}
	const found = new Map<string, AssumptionView>()
	for (const levy of taxLeviesOf(document)) {
		for (const view of assumptionViews(
			thLevyAssumptionsForLabels(levy as unknown as ThAssumptionLevy, labels),
		)) {
			if (!found.has(view.path)) found.set(view.path, view)
		}
	}
	return withCeilingNotes([...found.values()], ceilingNotes)
}
