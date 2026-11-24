import { z } from "zod"
import type { ScenarioDocument } from "../document"
import { holdsTaxLevy } from "./holds"
import { TAX_ALLOWANCE_CLASSES, type TaxProfileView, taxProfileOf } from "./profile"
import { requestOfStored, type StoredTax } from "./stored"

export const taxAllowancesShape: z.ZodType<TaxProfileView> = z
	.strictObject({
		stated: z
			.array(z.enum(TAX_ALLOWANCE_CLASSES))
			.describe(
				"The deduction classes the stored profile and the plan's contribution Flows state.",
			),
		notStated: z
			.array(z.enum(TAX_ALLOWANCE_CLASSES))
			.describe(
				"The deduction classes this build supports that the plan leaves out, so its tax leaves them out. It is the `allowances.notStated` that `scenario tax --from-stored --dry-run` reports.",
			),
	})
	.describe(
		"Which deduction classes a taxed plan states and which it does not, from the same rule `scenario tax` reports (cli ADR-0073). It says what the plan was told, not what tax-core applied. Absent when the plan is untaxed or holds a Levy with no stored profile, because the flags cannot be read back from a Levy (cli ADR-0066).",
	)

/**
 * The deduction classes a taxed plan states, from the function `scenario tax` reports `allowances`
 * with, over the stored profile and the document that holds the Levy (cli ADR-0073). `undefined`
 * when no profile is stored: a Levy alone does not say which flags wrote it.
 */
export function taxAllowancesOf(
	tax: StoredTax | null,
	document: ScenarioDocument,
): TaxProfileView | undefined {
	if (tax === null || !holdsTaxLevy(document)) return undefined
	return taxProfileOf(requestOfStored(tax), document)
}
