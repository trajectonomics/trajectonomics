import { describe, expect, it } from "bun:test"
import { addDays, addMonthsClamped } from "../calendar/arith"
import { project } from "../engine/project"
import {
	contribution,
	derivedContribution,
	derivedExpense,
	derivedIncome,
	expense,
	income,
} from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import { financialIndependence } from "../index"
import type { Derive, Scenario, SurvivalOptions } from "../types"

function portion(flow: string, percent: number): Derive {
	return {
		measures: [
			{ id: "source", op: "flow", flow },
			{ id: "result", op: "scale", of: "source", num: percent, den: 100, rounding: "halfUp" },
		],
		result: "result",
	}
}

const survival: SurvivalOptions = { method: "survival" }
const spending = { amount: 5_000_000, growth: { bps: 0 } }

/** The refusal of the debt payment, which every case here writes as the third Flow. */
const refused = {
	ok: false,
	problems: [
		{ code: "DERIVED_DEBT_PAYMENT_READS_EARNED", path: ["scenario", "flows", 2, "derive"] },
	],
}

/** Whether the plan never runs out once earned income stops on the day before `month`. */
function survivesFrom(fixture: Fixture, month: string): boolean {
	const last = addDays(month, -1)
	const flows = fixture.scenario.flows.map((flow) =>
		flow.kind === "income" && flow.earned ? { ...flow, end: last } : flow,
	)
	const result = project(fixture.baseline, { ...fixture.scenario, flows }, fixture.timeline)
	return result.ok && result.projection.runsOut === undefined
}

/** Salary and living expenses; the mortgage is `payment`, passed in as the Flow under test. */
function mortgageCase(payment: Scenario["flows"][number], extra: Scenario["flows"] = []) {
	return makeFixture({
		accounts: [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "mortgage", kind: "liability", rate: 600 },
		],
		balances: { cash: 1_600_000_000, mortgage: 300_000_000 },
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2046-12-31",
		resolution: "month",
		flows: [
			income("salary", 10_000_000, { frequency: "monthly", start: "2026-01-01" }),
			expense("living", 6_000_000, { frequency: "monthly", start: "2026-01-01" }),
			payment,
			...extra,
		],
	})
}

const monthly = { frequency: "monthly", start: "2026-01-01" } as const

describe("a Derived debt payment in the Financial Independence test", () => {
	it("pins the fixed payment's FI month and refuses the same money written as 40% of salary", () => {
		const fixed = mortgageCase(contribution("payment", "mortgage", 4_000_000, monthly))
		const fixedResult = financialIndependence(
			fixed.baseline,
			fixed.scenario,
			fixed.timeline,
			survival,
		)
		expect(fixedResult).toMatchObject({
			ok: true,
			financialIndependence: { reachable: true, month: "2028-06-01" },
		})
		expect(survivesFrom(fixed, "2028-06-01")).toBe(true)
		expect(survivesFrom(fixed, addMonthsClamped("2028-06-01", -1))).toBe(false)

		const derived = mortgageCase(
			derivedContribution("payment", "mortgage", portion("salary", 40), monthly),
		)
		expect(
			financialIndependence(derived.baseline, derived.scenario, derived.timeline, survival),
		).toEqual(refused)
	})

	it("refuses the derived debt payment even when retirement spending is set", () => {
		const derived = mortgageCase(
			derivedContribution("payment", "mortgage", portion("salary", 40), monthly),
		)
		expect(
			financialIndependence(derived.baseline, derived.scenario, derived.timeline, {
				method: "survival",
				retirementSpending: spending,
			}),
		).toEqual(refused)
	})

	it("still returns the month for a derived contribution into an asset", () => {
		const fixture = makeFixture({
			accounts: [
				{ id: "cash", kind: "asset", rate: 0 },
				{ id: "savings", kind: "asset", rate: 0 },
			],
			balances: { cash: 0 },
			surplus: [{ account: "cash" }],
			contribute: ["savings"],
			withdraw: ["cash"],
			start: "2026-01-01",
			horizon: "2026-12-31",
			resolution: "month",
			flows: [
				income("salary", 1_000, monthly),
				expense("food", 500, monthly),
				derivedContribution("save", "savings", portion("salary", 30), monthly),
			],
		})
		expect(
			financialIndependence(fixture.baseline, fixture.scenario, fixture.timeline, survival),
		).toMatchObject({ ok: true, financialIndependence: { reachable: true, month: "2026-10-01" } })
	})

	it("still returns the month for a derived debt payment that reads only passive income", () => {
		const fixture = mortgageCase(
			derivedContribution("payment", "mortgage", portion("rent", 100), monthly),
			[income("rent", 4_000_000, { ...monthly, earned: false })],
		)
		expect(
			financialIndependence(fixture.baseline, fixture.scenario, fixture.timeline, survival),
		).toMatchObject({ ok: true, financialIndependence: { reachable: true, month: "2026-01-01" } })
	})

	it("refuses a two-hop graph: the payment reads a derived bonus that reads salary", () => {
		const fixture = mortgageCase(
			derivedContribution("payment", "mortgage", portion("bonus", 50), monthly),
			[derivedIncome("bonus", portion("salary", 40), monthly)],
		)
		expect(
			financialIndependence(fixture.baseline, fixture.scenario, fixture.timeline, survival),
		).toEqual(refused)
	})

	it("refuses probabilityThreshold before the return model is checked", () => {
		const derived = mortgageCase(
			derivedContribution("payment", "mortgage", portion("salary", 40), monthly),
		)
		expect(
			financialIndependence(derived.baseline, derived.scenario, derived.timeline, {
				method: "probabilityThreshold",
				thresholdBps: 9_000,
				paths: 10,
				seed: "0000000000000000",
			}),
		).toEqual(refused)
	})

	it("reports the expense refusal first, and the debt-payment refusal once retirement spending waives the expense", () => {
		const fixture = mortgageCase(
			derivedContribution("payment", "mortgage", portion("salary", 40), monthly),
			[derivedExpense("rent", portion("salary", 30), monthly)],
		)
		const { baseline, scenario, timeline } = fixture
		expect(financialIndependence(baseline, scenario, timeline, survival)).toEqual({
			ok: false,
			problems: [
				{ code: "DERIVED_EXPENSE_READS_EARNED", path: ["scenario", "flows", 3, "derive"] },
			],
		})
		expect(
			financialIndependence(baseline, scenario, timeline, {
				method: "survival",
				retirementSpending: spending,
			}),
		).toEqual(refused)
	})

	it("still projects the refused Scenario, with no runsOut on the plain Projection", () => {
		const derived = mortgageCase(
			derivedContribution("payment", "mortgage", portion("salary", 40), monthly),
		)
		const result = project(derived.baseline, derived.scenario, derived.timeline)
		expect(result.ok).toBe(true)
		if (!result.ok) throw new Error("Expected a projection")
		expect(result.projection.runsOut).toBeUndefined()
	})
})
