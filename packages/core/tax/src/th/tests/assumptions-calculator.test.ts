import { describe, expect, it } from "bun:test"
import { calculateThTax } from "../calculate"
import {
	ThFinalWithholdingElection,
	ThRealEstateAcquisitionType,
	ThSeparateSheetPaymentType,
} from "../types"

const paths = (input: Parameters<typeof calculateThTax>[0]): string[] =>
	calculateThTax(input).assumptions.map((entry) => entry.path)

describe("calculateThTax assumptions", () => {
	it("is empty when every figure used is confirmed", () => {
		const result = calculateThTax({ income: { section40_1: 900_000 } })
		expect(result.assumptions).toEqual([])
	})

	it("is empty for a default calculation", () => {
		expect(calculateThTax().assumptions).toEqual([])
	})

	it("names the digital asset rate only when digital asset income was taxed as final", () => {
		const digital = (election: ThFinalWithholdingElection) => ({
			income: { section40_4: { digitalAssets: { amount: 100_000, election } } },
		})
		expect(calculateThTax(digital(ThFinalWithholdingElection.Final)).assumptions).toEqual([
			{
				path: "finalWithholding.digitalAssetRate",
				value: 0.15,
				status: "unsourced",
				note: "Digital asset withholding rate; assumed equal to the interest rate.",
			},
		])
		expect(paths(digital(ThFinalWithholdingElection.Include))).toEqual([])
		expect(paths({ income: { section40_4: { digitalAssets: 0 } } })).toEqual([])
	})

	it("names a retirement fund's figures only when it was claimed", () => {
		const claimed = paths({ income: { section40_1: 900_000 }, allowances: { gpf: 50_000 } })
		expect(claimed).toEqual([
			"allowances.retirementCluster.combinedCeiling",
			"allowances.retirementCluster.gpf.ceiling",
			"allowances.retirementCluster.gpf.maxRate",
		])
		expect(paths({ income: { section40_1: 900_000 }, allowances: { gpf: 0, rmf: 0 } })).toEqual([])
	})

	it("names the allowance figures for the classes claimed", () => {
		const result = calculateThTax({
			allowances: { lifeInsurance: 10_000, mortgageInterest: 1, donation2x: 5_000 },
		})
		expect(result.assumptions.map((entry) => entry.path)).toEqual([
			"allowances.donations.donation2xMultiplier",
			"allowances.lifeInsurance.combinedCeiling",
			"allowances.mortgageInterestCeiling",
		])
		expect(result.assumptions[0]?.value).toBe(2)
	})

	it("names a rental or profession rate only for the standard expense election", () => {
		const income = {
			section40_5: {
				building: 400_000,
				vehicles: { amount: 100_000, expenseElection: "actual" as const },
			},
			section40_6: { law: { amount: 300_000 }, medical: 0 },
		}
		expect(paths({ income })).toEqual([
			"expenses.section40_5.building",
			"expenses.section40_6.other",
		])
	})

	it("names the separate sheet, severance and real estate figures when those regimes ran", () => {
		const sheet = { amount: 800_000, yearsOfService: 10, lastDailyWage: 1_500 }
		expect(paths({ separateSheet: sheet })).toEqual([
			"separateSheet.minYearsOfService",
			"separateSheet.exemptionCeiling",
			"separateSheet.exemptionWageDays",
		])
		const retirement = { ...sheet, paymentType: ThSeparateSheetPaymentType.Retirement }
		expect(paths({ separateSheet: retirement })).toEqual(["separateSheet.minYearsOfService"])
		const sale = { grossTransferValue: 5_000_000, holdingYears: 4 }
		const found = calculateThTax({ realEstateTransfer: sale }).assumptions
		expect(found.map((entry) => entry.path)).toEqual([
			"realEstate.expenseTable[*].minYears",
			"realEstate.expenseTable[*].rate",
		])
		expect(found[0]?.value).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
		const inherited = { ...sale, acquisitionType: ThRealEstateAcquisitionType.InheritanceOrGift }
		expect(paths({ realEstateTransfer: inherited })).toEqual([])
	})
})
