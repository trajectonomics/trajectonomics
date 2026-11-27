import type { ScenarioDocument } from "../document"
import { taxAssumptionsOf } from "../tax/assumptions"
import type { TaxFigure } from "./shape"

/**
 * The tax figures the stored Levy uses whose source is not yet confirmed, in the order
 * `taxAssumptionsOf` returns them (cli ADR-0042). `false` keeps the separate-loans sentence out of a
 * note: a plan on its own does not say its Returns take each loan to be separate (cli ADR-0075).
 */
export function taxFigureItems(document: ScenarioDocument): TaxFigure[] {
	return taxAssumptionsOf(document, false).map((figure) => ({
		kind: "tax-figure" as const,
		path: figure.path,
		value: figure.value,
		status: figure.status,
		note: figure.note,
		hint: null,
	}))
}
