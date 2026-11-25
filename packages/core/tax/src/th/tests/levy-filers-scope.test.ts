import { describe, expect, it } from "bun:test"
import type { Levy, Scenario } from "@trajectonomics/sim"
import { check } from "@trajectonomics/sim"
import { emitThLevy } from "../levy/emit"
import { thFilerLabel } from "../levy/filers"
import { ThLevyContributionLabel, ThLevyIncomeLabel } from "../levy/labels"
import { ThLevyMeasureId } from "../levy/measure-ids"
import type { ThLevyProfile } from "../levy/profile-types"
import { toSatang } from "../units"
import { levyValues, simTallies } from "./levy-sim"

const SALARY = ThLevyIncomeLabel.Section40_1
type Rows = ReadonlyArray<readonly [string, number]>

function run(profile: ThLevyProfile, income: Rows, contributions: Rows = []) {
	const satang = (rows: Rows) => new Map(rows.map(([label, amount]) => [label, toSatang(amount)]))
	return levyValues(emitThLevy(profile), simTallies(satang(income), satang(contributions)))
}

function baht(values: ReadonlyMap<string, number>, id: ThLevyMeasureId): number {
	return (values.get(id) ?? Number.NaN) / 100
}

const assessable = (profile: ThLevyProfile, income: Rows): number =>
	baht(run(profile, income), ThLevyMeasureId.AssessableTotal)

describe("a one-Filer Levy", () => {
	it("is the bare Levy over that Filer's labels, figure for figure", () => {
		const bare = run({}, [[SALARY, 700_000]])
		const own = run({ filers: ["me"] }, [[thFilerLabel(SALARY, "me"), 700_000]])
		for (const id of Object.values(ThLevyMeasureId)) expect(own.get(id)).toBe(bare.get(id))
		expect(baht(own, ThLevyMeasureId.NetTaxPayable)).toBeGreaterThan(0)
	})

	it("reads no shared income on single or married_no_income_spouse", () => {
		const income: Rows = [
			[thFilerLabel(SALARY, "me"), 100_000],
			[thFilerLabel(SALARY, "shared"), 50_000],
		]
		expect(assessable({ filers: ["me"] }, income)).toBe(100_000)
		const spouse: ThLevyProfile = { filers: ["me"], filingStatus: "married_no_income_spouse" }
		expect(assessable(spouse, income)).toBe(100_000)
	})

	// Shared 1,000.01 THB = 100,001 satang. Half is floor(100,001 / 2) = 50,000 satang = 500.00 THB.
	it("reads half of @shared under married_separate, rounded down", () => {
		const income: Rows = [
			[thFilerLabel(SALARY, "me"), 100_000],
			[thFilerLabel(SALARY, "shared"), 1_000.01],
		]
		expect(assessable({ filers: ["me"], filingStatus: "married_separate" }, income)).toBe(100_500)
	})

	it("loses at most one satang per label between two separate Returns, the same on both", () => {
		const profile = (filer: string): ThLevyProfile => ({
			filers: [filer],
			filingStatus: "married_separate",
		})
		const income = (filer: string): Rows => [
			[thFilerLabel(SALARY, filer), 100_000],
			[thFilerLabel(SALARY, "shared"), 1_000.01],
		]
		const sum = assessable(profile("a"), income("a")) + assessable(profile("b"), income("b"))
		expect(sum).toBe(201_000)
	})

	it("reads all of @shared on a joint Return of one Filer, which keeps the spouse allowance", () => {
		const income: Rows = [
			[thFilerLabel(SALARY, "me"), 100_000],
			[thFilerLabel(SALARY, "shared"), 1_000.01],
		]
		const profile: ThLevyProfile = { filers: ["me"], filingStatus: "married_joint" }
		expect(assessable(profile, income)).toBe(101_000.01)
		expect(baht(run(profile, income), ThLevyMeasureId.AllowancesFixed)).toBe(120_000)
	})
})

describe("retirement allowances of a joint Return are capped per Filer, then added", () => {
	const joint: ThLevyProfile = { filingStatus: "married_joint", filers: ["a", "b"] }
	const rmf = (filer: string): string => thFilerLabel(ThLevyContributionLabel.Rmf, filer)
	const esg = (filer: string): string => thFilerLabel(ThLevyContributionLabel.ThaiEsg, filer)

	// a earns 200,000: RMF cap 30% = 60,000, so 100,000 buys 60,000. b earns 1,000,000: cap 300,000,
	// so 50,000 buys 50,000. Cluster 110,000 (one cap on 1,200,000 would allow 150,000).
	// ThaiESG: a min(30% x 200,000 = 60,000, 100,000) = 60,000; b min(300,000, 400,000) = 300,000 -> 360,000.
	it("applies each Filer's own percentage caps", () => {
		const values = run(
			joint,
			[
				[thFilerLabel(SALARY, "a"), 200_000],
				[thFilerLabel(SALARY, "b"), 1_000_000],
			],
			[
				[rmf("a"), 100_000],
				[rmf("b"), 50_000],
				[esg("a"), 100_000],
				[esg("b"), 400_000],
			],
		)
		expect(baht(values, ThLevyMeasureId.RetirementCluster)).toBe(110_000)
		expect(baht(values, ThLevyMeasureId.ThaiEsg)).toBe(360_000)
	})

	// Each Filer buys 400,000 of RMF on 2,000,000: 800,000 together, under a 500,000 ceiling each.
	it("gives each Filer their own 500,000 cluster ceiling", () => {
		const salaries: Rows = [
			[thFilerLabel(SALARY, "a"), 2_000_000],
			[thFilerLabel(SALARY, "b"), 2_000_000],
		]
		const values = run(joint, salaries, [
			[rmf("a"), 400_000],
			[rmf("b"), 400_000],
		])
		expect(baht(values, ThLevyMeasureId.RetirementCluster)).toBe(800_000)
		const over = run(joint, salaries, [
			[rmf("a"), 500_000],
			[rmf("b"), 500_000],
		])
		expect(baht(over, ThLevyMeasureId.RetirementCluster)).toBe(1_000_000)
	})
})

describe("the other stages of a Levy with two Filers", () => {
	const joint: ThLevyProfile = { filingStatus: "married_joint", filers: ["a", "b"] }
	const interest = (filer: string): string =>
		thFilerLabel(ThLevyIncomeLabel.Section40_4Interest, filer)
	const dividends = (filer: string): string =>
		thFilerLabel(ThLevyIncomeLabel.Section40_4Dividends, filer)

	// Interest 100,000 + 50,000 is final at 15%: tax 22,500, outside the brackets. Dividends 80,000 + 20,000
	// are included, with the s.47 bis credit 25% x 100,000 = 25,000 (corporate rate 20%): assessable 125,000.
	it("sums the s.40(4) split of both Filers into one set of audited Measures", () => {
		const profile: ThLevyProfile = {
			...joint,
			section40_4: { interest: "final", dividendCorpTaxRate: 0.2 },
		}
		const values = run(profile, [
			[interest("a"), 100_000],
			[interest("b"), 50_000],
			[dividends("a"), 80_000],
			[dividends("b"), 20_000],
		])
		expect(baht(values, ThLevyMeasureId.FinalWithholdingTax)).toBe(22_500)
		expect(baht(values, ThLevyMeasureId.DividendCredit)).toBe(25_000)
		expect(baht(values, ThLevyMeasureId.AssessableTotal)).toBe(125_000)
	})

	// Royalties of 100,000 each. Standard: 50,000 + 50,000 = 100,000, each Filer's own 50%.
	// An elected actual expense of 30,000 is one figure for the Return: min(200,000, 30,000) = 30,000.
	it("computes s.42 ter per Filer, and an elected actual expense once", () => {
		const royalty = (filer: string): string => thFilerLabel(ThLevyIncomeLabel.Section40_3, filer)
		const income: Rows = [
			[royalty("a"), 100_000],
			[royalty("b"), 100_000],
		]
		expect(baht(run(joint, income), ThLevyMeasureId.ExpensesTotal)).toBe(100_000)
		const actual: ThLevyProfile = {
			...joint,
			expenses: { section40_3: { election: "actual", actualExpense: 30_000 } },
		}
		expect(baht(run(actual, income), ThLevyMeasureId.ExpensesTotal)).toBe(30_000)
	})

	it("emits a Levy sim-core accepts, with unique Measure ids", () => {
		const levy: Levy = emitThLevy(joint)
		const scenario: Scenario = {
			schemaVersion: 4,
			currency: "THB",
			economy: { inflation: 0 },
			accounts: [{ id: "cash", kind: "asset", rate: 0 }],
			flows: ["a", "b"].map((filer) => ({
				id: `salary-${filer}`,
				kind: "income",
				earned: true,
				label: thFilerLabel(SALARY, filer),
				amount: 0,
				frequency: "monthly",
				start: "2026-01-01",
				growth: "inflation",
			})),
			cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: [] },
			levies: [{ ...levy, carryIn: [{ periodStart: "2025-01-01", tallies: [], prepaid: 0 }] }],
		}
		const baseline = { schemaVersion: 1, balances: [] }
		const timeline = { start: "2026-01-01", horizon: "2026-12-31", resolution: "month" }
		expect(check(baseline, scenario, timeline)).toEqual([])
		expect(new Set(levy.measures.map((measure) => measure.id)).size).toBe(levy.measures.length)
	})
})
