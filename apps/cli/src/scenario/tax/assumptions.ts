import type { ThAssumptionLevy } from "@trajectonomics/core/tax/th"
import { thLevyAssumptionsForLabels } from "@trajectonomics/core/tax/th"
import { type AssumptionView, assumptionViews } from "../../tax-assumptions"
import type { ScenarioDocument } from "../document"
import { flowsOf } from "./labels"
import { leviesOf, TAX_LEVY_ID } from "./levy"

/**
 * The tax figures the Levy this write stored would use whose source is not yet confirmed, read
 * from the Levy's own measures and the labels the document's Flows carry (ADR-0042). A write has
 * no period to evaluate, so a label counts as used when any Flow carries it; a Projection says
 * which tax years actually used a figure.
 */
export function taxAssumptionsOf(document: ScenarioDocument): AssumptionView[] {
	const levy = leviesOf(document).find((it) => it["id"] === TAX_LEVY_ID)
	if (levy === undefined) return []
	const labels = new Set<string>()
	for (const flow of flowsOf(document)) {
		if (typeof flow["label"] === "string") labels.add(flow["label"])
	}
	return assumptionViews(thLevyAssumptionsForLabels(levy as unknown as ThAssumptionLevy, labels))
}
