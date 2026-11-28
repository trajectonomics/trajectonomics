import type { ScenarioDocument } from "../document"
import type { Household } from "../household/model"
import { formatPath } from "../path"
import { isTaxed } from "../shown"
import type { UnlabelledIncome } from "./shape"
import { unlabelledHintsOf } from "./unlabelled-filers"

/**
 * The income Flows a taxed plan gives no label, in document order (cli ADR-0083). No Levy is told
 * about one, so its income never reaches the tax; the hint states a Section 40 label, or another one.
 * A Levy with Filers reads only suffixed labels, so the hint carries the Owner's suffix, or names
 * the suffixes it reads when no Owner says whose the income is.
 */
export function unlabelledIncomeItems(
	name: string,
	document: ScenarioDocument,
	household: Household | null,
): UnlabelledIncome[] {
	if (!isTaxed(document)) return []
	return unlabelledHintsOf(name, document, household).map(({ id, hint }) => ({
		kind: "unlabelled-income" as const,
		path: formatPath(["flows", id, "label"]),
		value: null,
		hint,
	}))
}
