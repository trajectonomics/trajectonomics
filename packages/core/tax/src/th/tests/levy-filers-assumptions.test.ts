import { describe, expect, it } from "bun:test"
import { thLevyAssumptions, thLevyAssumptionsForLabels } from "../assumptions/levy"
import { emitThLevy } from "../levy/emit"
import { thFilerLabel } from "../levy/filers"
import { ThLevyContributionLabel, ThLevyIncomeLabel } from "../levy/labels"
import type { ThLevyProfile } from "../levy/profile-types"
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
