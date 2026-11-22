import { describe, expect, it } from "bun:test"
import { thLevyAssumptions, thLevyAssumptionsForLabels } from "../assumptions/levy"
import { emitThLevy } from "../levy/emit"
import type { ThLevy } from "../levy/graph-types"
import { ThLevyContributionLabel, ThLevyIncomeLabel } from "../levy/labels"
import { ThFinalWithholdingElection } from "../types"
import { levyValues, simTallies } from "./levy-sim"

const pathsOf = (found: readonly { readonly path: string }[]): string[] =>
	found.map((entry) => entry.path)

function valuesOf(levy: ThLevy, gross: [string, number][], funded: [string, number][] = []) {
	const values = levyValues(levy, simTallies(new Map(gross), new Map(funded)))
	return [...values].map(([id, value]) => ({ id, value }))
}

describe("thLevyAssumptions", () => {
	it("is empty for a plain employee Levy", () => {
		const levy = emitThLevy({ allowances: { children: { totalCount: 1 } } })
		const values = valuesOf(levy, [[ThLevyIncomeLabel.Section40_1, 90_000_000]])
		expect(thLevyAssumptions(levy, values)).toEqual([])
	})

	it("names a retirement fund's figures only in a period where it was funded", () => {
		const levy = emitThLevy()
		const wage: [string, number][] = [[ThLevyIncomeLabel.Section40_1, 90_000_000]]
		const funded = valuesOf(levy, wage, [[ThLevyContributionLabel.Gpf, 5_000_000]])
		expect(pathsOf(thLevyAssumptions(levy, funded))).toEqual([
			"allowances.retirementCluster.combinedCeiling",
		])
		expect(thLevyAssumptions(levy, valuesOf(levy, wage))).toEqual([])
	})

	it("names the standard expense rate of a rental or profession, not an actual election", () => {
		const standard = emitThLevy()
		const actual = emitThLevy({
			expenses: { section40_5: { building: { election: "actual", actualExpense: 1 } } },
		})
		const rent: [string, number][] = [
			[ThLevyIncomeLabel.Section40_5Building, 40_000_000],
			[ThLevyIncomeLabel.Section40_6Law, 10_000_000],
		]
		expect(pathsOf(thLevyAssumptions(standard, valuesOf(standard, rent)))).toEqual([
			"expenses.section40_5.building",
			"expenses.section40_6.other",
		])
		expect(pathsOf(thLevyAssumptions(actual, valuesOf(actual, rent)))).toEqual([
			"expenses.section40_6.other",
		])
	})

	it("names the digital asset rate only when the Levy withholds it as final", () => {
		const gross: [string, number][] = [[ThLevyIncomeLabel.Section40_4DigitalAssets, 10_000_000]]
		const final = emitThLevy({ section40_4: { digitalAssets: ThFinalWithholdingElection.Final } })
		const included = emitThLevy()
		expect(pathsOf(thLevyAssumptions(final, valuesOf(final, gross)))).toEqual([
			"finalWithholding.digitalAssetRate",
		])
		expect(thLevyAssumptions(included, valuesOf(included, gross))).toEqual([])
		expect(thLevyAssumptions(final, valuesOf(final, []))).toEqual([])
	})

	it("names each stated allowance class's figures, in every period", () => {
		const levy = emitThLevy({
			allowances: {
				lifeInsurance: 20_000,
				healthInsurance: 10_000,
				parentHealthInsurance: 5_000,
				socialSecurity: 9_000,
				donation2x: 3_000,
				mortgageInterest: 40_000,
				donation1x: 1_000,
			},
		})
		expect(pathsOf(thLevyAssumptions(levy, valuesOf(levy, [])))).toEqual([
			"allowances.donations.donation2xMultiplier",
			"allowances.lifeInsurance.combinedCeiling",
			"allowances.lifeInsurance.healthCeiling",
			"allowances.mortgageInterestCeiling",
			"allowances.parentHealthInsuranceCeiling",
			"allowances.socialSecurityFundCeiling",
		])
	})

	it("does not move a tax figure: the audit consts feed no Measure", () => {
		const bare = emitThLevy({ allowances: { lifeInsurance: 20_000 } })
		const stated = bare.measures.filter((measure) => measure.id.startsWith("claim."))
		expect(stated).toHaveLength(1)
		const reads = bare.measures.flatMap((measure) => ("of" in measure ? [measure.of] : []))
		expect(reads).not.toContain(stated[0]?.id)
	})
})

describe("thLevyAssumptionsForLabels", () => {
	it("names the figures of the labels a write was given", () => {
		const levy = emitThLevy({ allowances: { mortgageInterest: 1_000 } })
		const found = thLevyAssumptionsForLabels(
			levy,
			new Set([ThLevyIncomeLabel.Section40_5Other, ThLevyContributionLabel.Rmf]),
		)
		expect(pathsOf(found)).toEqual([
			"allowances.mortgageInterestCeiling",
			"allowances.retirementCluster.combinedCeiling",
			"allowances.retirementCluster.rmf.ceiling",
			"allowances.retirementCluster.rmf.maxRate",
			"expenses.section40_5.other",
		])
		expect(thLevyAssumptionsForLabels(levy, new Set([ThLevyIncomeLabel.Section40_1]))).toHaveLength(
			1,
		)
	})
})
