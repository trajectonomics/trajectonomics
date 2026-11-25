import { describe, expect, it } from "bun:test"
import { thLevyAssumptions, thLevyAssumptionsForLabels } from "../assumptions/levy"
import { emitThLevy } from "../levy/emit"
import { thFilerLabel } from "../levy/filers"
import { ThLevyContributionLabel, ThLevyIncomeLabel } from "../levy/labels"
import type { ThLevyProfile } from "../levy/profile-types"
import { ThFinalWithholdingElection } from "../types"
import { levyValues, simTallies } from "./levy-sim"

const RENTAL_PATH = "expenses.section40_5.other"
const pathsOf = (found: readonly { readonly path: string }[]): string[] =>
	found.map((entry) => entry.path)

describe("the unconfirmed figures of a Levy with Filers", () => {
	const profiles: Readonly<Record<string, ThLevyProfile>> = {
		"one Filer": { filers: ["a"] },
		"one Filer with half of @shared": { filers: ["a"], filingStatus: "married_separate" },
		"two Filers": { filers: ["a", "b"], filingStatus: "married_joint" },
	}
	for (const [name, profile] of Object.entries(profiles)) {
		it(`names a Filer's rental rate for ${name}, as the bare labels do`, () => {
			const levy = emitThLevy(profile)
			const rental = thFilerLabel(ThLevyIncomeLabel.Section40_5Other, "a")
			const fund = thFilerLabel(ThLevyContributionLabel.Gpf, "a")
			const values = levyValues(levy, simTallies(new Map([[rental, 4_000_000]])))
			const measures = [...values].map(([id, value]) => ({ id, value }))
			expect(pathsOf(thLevyAssumptions(levy, measures))).toEqual([RENTAL_PATH])
			expect(pathsOf(thLevyAssumptionsForLabels(levy, new Set([rental])))).toEqual([RENTAL_PATH])
			expect(pathsOf(thLevyAssumptionsForLabels(levy, new Set([fund])))).toEqual([
				"allowances.retirementCluster.combinedCeiling",
			])
		})
	}
})

describe("income under @shared is named only by what scales it", () => {
	const building = thFilerLabel(ThLevyIncomeLabel.Section40_5Building, "shared")
	const digital = thFilerLabel(ThLevyIncomeLabel.Section40_4DigitalAssets, "shared")
	const returns: Readonly<Record<string, ThLevyProfile>> = {
		"married_separate, one Filer": { filers: ["a"], filingStatus: "married_separate" },
		"married_joint, one Filer": { filers: ["a"], filingStatus: "married_joint" },
		"married_joint, two Filers": { filers: ["a", "b"], filingStatus: "married_joint" },
	}
	const found = (profile: ThLevyProfile, label: string): string[] => {
		const levy = emitThLevy(profile)
		const values = levyValues(levy, simTallies(new Map([[label, 10_000_000]])))
		const measures = [...values].map(([id, value]) => ({ id, value }))
		const byValues = pathsOf(thLevyAssumptions(levy, measures))
		expect(pathsOf(thLevyAssumptionsForLabels(levy, new Set([label])))).toEqual(byValues)
		return byValues
	}
	for (const [name, base] of Object.entries(returns)) {
		it(`names the standard rental rate of shared rent, not an elected actual one: ${name}`, () => {
			const actual = {
				section40_5: { building: { election: "actual", actualExpense: 1 } },
			} as const
			expect(found({ ...base, expenses: actual }, building)).toEqual([])
			expect(found(base, building)).toEqual(["expenses.section40_5.building"])
		})

		it(`names the digital asset rate of shared income only when it is final: ${name}`, () => {
			const final = { digitalAssets: ThFinalWithholdingElection.Final }
			expect(found({ ...base, section40_4: final }, digital)).toEqual([
				"finalWithholding.digitalAssetRate",
			])
			expect(found(base, digital)).toEqual([])
		})
	}
})
