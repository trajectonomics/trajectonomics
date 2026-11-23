/** What the page says about the plan's estate lines, from the document and never from a figure (cli ADR 0064). */
import type { ScenarioDocument } from "../../contract"

/** The note on a plan with no settlement cost: the net estate is everything owned less debts, which is not what heirs keep. */
export const NO_COST_NOTE =
	"This plan states no settlement cost, so the net estate is everything owned less what is owed. A cost is your own figure: add one as a share or a fixed amount."

/** What no part of the page works out: inheritance tax and transfer fees are a cost line the person writes. */
export const NOT_MODELLED_NOTE =
	"Inheritance tax and transfer fees are not worked out for you. If they apply, add them as a settlement cost."

/** The note for a plan that states no cost line, or null when it states one. */
export function noCostNote(doc: ScenarioDocument): string | null {
	return (doc.estate?.costs?.length ?? 0) === 0 ? NO_COST_NOTE : null
}
