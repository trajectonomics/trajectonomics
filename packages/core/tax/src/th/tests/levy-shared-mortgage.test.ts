import { describe, expect, it } from "bun:test"
import { TaxValidationError } from "../../core/money"
import { emitThLevy } from "../levy/emit"
import { TH_LEVY_SHARED_FILER, ThLevyFilerField, thFilerLabel } from "../levy/filers"
import { ThLevyIncomeLabel } from "../levy/labels"
import { ThLevyMeasureId } from "../levy/measure-ids"
import type { ThLevyProfile } from "../levy/profile-types"
import { ThAllowanceField } from "../types"
import { toSatang } from "../units"
import { levyValues, simTallies } from "./levy-sim"

const SALARY = ThLevyIncomeLabel.Section40_1
const salary = (filer: string) => thFilerLabel(SALARY, filer)

function figures(profile: ThLevyProfile, tallies: ReadonlyArray<readonly [string, number]>) {
	const income = new Map(tallies.map(([label, baht]) => [label, toSatang(baht)] as const))
	const values = levyValues(emitThLevy(profile), simTallies(income))
	const read = (id: ThLevyMeasureId): number => (values.get(id) ?? Number.NaN) / 100
	return {
		allowances: read(ThLevyMeasureId.AllowancesTotal),
		tax: read(ThLevyMeasureId.NetTaxPayable),
	}
}

function fieldOf(run: () => unknown): string | undefined {
	try {
		run()
	} catch (error) {
		return error instanceof TaxValidationError ? error.field : String(error)
	}
	return undefined
}

/** A separate Return of the holder, claiming 30,000 of a 60,000 loan when both earn. */
function holder(own: number): ThLevyProfile {
	return {
		filingStatus: "married_separate",
		filers: ["me"],
		allowances: { mortgageInterest: own + 30_000 },
		sharedMortgage: { other: "partner", own, total: 60_000 },
	}
}

describe("a shared home loan is claimed per period (s.47(1)(ซ))", () => {
	// Salary 1,000,000, share 30,000, own 0. Both earners:
	//   assessable 1,000,000; expenses min(50%, 100,000) = 100,000;
	//   allowances personal 60,000 + mortgage 30,000 = 90,000;
	//   taxable 810,000; tax 0 + 7,500 + 20,000 + 37,500 + 20% x 60,000 = 77,000.
	it("splits the loan when both Filers have income", () => {
		expect(
			figures(holder(0), [
				[salary("me"), 1_000_000],
				[salary("partner"), 500_000],
			]),
		).toEqual({
			allowances: 90_000,
			tax: 77_000,
		})
	})

	// Only the holder earns: mortgage 60,000; allowances 60,000 + 60,000 = 120,000;
	//   taxable 780,000; tax 0 + 7,500 + 20,000 + 37,500 + 20% x 30,000 = 71,000.
	it("gives the whole loan to the only Filer with income", () => {
		expect(figures(holder(0), [[salary("me"), 1_000_000]])).toEqual({
			allowances: 120_000,
			tax: 71_000,
		})
	})

	// The other Filer alone earns, so this Return claims nothing of the loan:
	//   allowances personal 60,000 only; no assessable income, so no tax.
	it("claims nothing when only the other Filer has income", () => {
		expect(figures(holder(0), [[salary("partner"), 1_000_000]])).toEqual({
			allowances: 60_000,
			tax: 0,
		})
	})

	// Own interest 50,000. Both earn: mortgage min(50,000 + 30,000, 100,000) = 80,000;
	//   allowances 140,000; taxable 760,000; tax 65,000 + 20% x 10,000 = 67,000.
	// Alone: mortgage min(50,000 + 60,000, 100,000) = 100,000; allowances 160,000;
	//   taxable 740,000; tax 7,500 + 20,000 + 15% x 240,000 = 63,500.
	it("counts this Return's own interest before the one ceiling", () => {
		expect(
			figures(holder(50_000), [
				[salary("me"), 1_000_000],
				[salary("partner"), 1_000_000],
			]),
		).toEqual({ allowances: 140_000, tax: 67_000 })
		expect(figures(holder(50_000), [[salary("me"), 1_000_000]])).toEqual({
			allowances: 160_000,
			tax: 63_500,
		})
	})

	// Shared salary 50,000 splits 25,000 to each, so the partner still has income:
	//   the holder keeps its 30,000 share; allowances 60,000 + 30,000 = 90,000.
	it("counts the other Filer's half of shared income", () => {
		const found = figures(holder(0), [
			[salary("me"), 1_000_000],
			[salary(TH_LEVY_SHARED_FILER), 50_000],
		])
		expect(found.allowances).toBe(90_000)
	})
})

describe("an invalid shared loan is refused at its field", () => {
	it("refuses the other Filer id the Filer list refuses", () => {
		const bad = (other: string) => () =>
			emitThLevy({
				filingStatus: "married_separate",
				filers: ["me"],
				sharedMortgage: { other, own: 0, total: 60_000 },
			})
		expect(fieldOf(bad("Me"))).toBe(ThLevyFilerField.Id)
		expect(fieldOf(bad(TH_LEVY_SHARED_FILER))).toBe(ThLevyFilerField.Shared)
	})

	it("refuses a negative own or whole interest", () => {
		for (const amount of [
			{ own: -1, total: 60_000 },
			{ own: 0, total: -1 },
		]) {
			expect(
				fieldOf(() =>
					emitThLevy({
						filingStatus: "married_separate",
						filers: ["me"],
						sharedMortgage: { other: "partner", ...amount },
					}),
				),
			).toBe(ThAllowanceField.MortgageInterest)
		}
	})
})
