import type { ScenarioRow } from "../../store"
import type { ScenarioDocument } from "../document"
import type { Household } from "../household/model"
import type { TaxProfileView } from "../tax/profile"
import { unstatedAllowanceItems } from "./allowances"
import type { AssumedItem } from "./shape"
import { taxFigureItems } from "./tax-figures"
import { templateDefaultItems } from "./template-default"
import { unlabelledIncomeItems } from "./unlabelled"

/**
 * The values a plan assumes that nobody stated, in the fixed kind order (cli ADR-0083, ADR-0084):
 * template defaults, then unlabelled income, unstated allowances and unconfirmed tax figures. The
 * stored kinds read `plain`; `template-default` reads `printed` for the value and the hint.
 */
export function assumedOf(
	row: ScenarioRow,
	plain: ScenarioDocument,
	printed: ScenarioDocument,
	taxAllowances: TaxProfileView | undefined,
	household: Household | null,
): AssumedItem[] {
	return [
		...templateDefaultItems(row, plain, printed),
		...unlabelledIncomeItems(row.name, plain, household, taxAllowances !== undefined),
		...unstatedAllowanceItems(row.name, taxAllowances, plain),
		...taxFigureItems(plain),
	]
}
