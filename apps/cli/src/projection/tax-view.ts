import type { LevyReport, Scenario } from "@trajectonomics/core/sim"
import { thLevyAssumptions } from "@trajectonomics/core/tax/th"
import { filerOfTaxLevy } from "../scenario/tax"
import { assumptionViews } from "../tax-assumptions"
import { moneyOf } from "./money"
import { breakdownOf } from "./tax-breakdown"
import type { TaxYearView } from "./tax-year-view"

/**
 * The Projection's Levy periods in the CLI's money. `owed` is the engine's own `settlement`, which
 * it already computes as due minus prepaid (ADR-0032); the CLI subtracts nothing.
 */
export function taxYearsOf(
	levies: readonly LevyReport[] | undefined,
	currency: string,
	document: Scenario,
): TaxYearView[] {
	if (levies === undefined) return []
	return levies.flatMap((levy) => {
		const rules = document.levies?.find((it) => it.id === levy.id)
		const filer = filerOfTaxLevy(levy.id)
		return levy.periods.map((period) => ({
			levy: levy.id,
			...(filer === undefined ? {} : { filer }),
			from: period.from,
			to: period.to,
			settlementDate: period.settlementDate,
			due: moneyOf(currency)(period.due),
			prepaid: moneyOf(currency)(period.prepaid),
			owed: moneyOf(currency)(period.settlement),
			settled: period.settled,
			partial: period.partial,
			...breakdownOf(period.measures, moneyOf(currency), period.due),
			assumptions:
				rules === undefined ? [] : assumptionViews(thLevyAssumptions(rules, period.measures)),
		}))
	})
}
