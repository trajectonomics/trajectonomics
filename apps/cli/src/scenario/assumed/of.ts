import type { ScenarioRow } from "../../store"
import type { ScenarioDocument } from "../document"
import type { TaxProfileView } from "../tax/profile"
import { unstatedAllowanceItems } from "./allowances"
import type { AssumedItem } from "./shape"
import { taxFigureItems } from "./tax-figures"
import { unlabelledIncomeItems } from "./unlabelled"

/**
 * The values a plan assumes that nobody stated, in the fixed kind order (cli ADR-0083): unlabelled
 * income, then unstated allowances, then unconfirmed tax figures. Every derived kind reads `plain`,
 * the stored document. `_printed` is the `--decimal` form, which the `template-default` kind reads
 * when it arrives with the stored column in cli ADR-0084.
 */
export function assumedOf(
	row: ScenarioRow,
	plain: ScenarioDocument,
	_printed: ScenarioDocument,
	taxAllowances: TaxProfileView | undefined,
): AssumedItem[] {
	return [
		...unlabelledIncomeItems(row.name, plain),
		...unstatedAllowanceItems(row.name, taxAllowances),
		...taxFigureItems(plain),
	]
}
