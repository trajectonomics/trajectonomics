import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { withdrawal } from "../engine/test-assets"
import { employerShare } from "../engine/test-employer"
import { expense, income } from "../engine/test-flows"
import { amounts, makeFixture, rowAt } from "../engine/test-helpers"
import { financialIndependence } from "../index"
import type { Milestone, SurvivalOptions } from "../types"
import { oracleAccountFi } from "./oracle-account-fi"
import { oracleAccountWalk } from "./oracle-account-walk"
import { oracleCashflow } from "./oracle-cashflow"

const accounts = [
	{ id: "cash", kind: "asset", rate: 0 },
	{ id: "pvd", kind: "asset", rate: 0 },
] as const
const DAY = "2026-03-15"

describe("a sale on the Landed date of an employer share sells the share too (ADR 0026)", () => {
	// pvd and cash hold 0. The employer's 10,000 lands in pvd first; the sale of 10,000 from pvd then
	// takes all of it: cash 10,000, pvd 0. A sale that ran first would find pvd empty and sell nothing.
	const fixture = makeFixture({
		accounts,
		balances: { cash: 0, pvd: 0 },
		flows: [
			employerShare("pvd-employer", "pvd", 10_000, { start: DAY }),
			withdrawal("sale", "pvd", 10_000, { start: DAY }),
		],
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-03-14",
		horizon: "2026-03-16",
		resolution: "day",
	})
	const { baseline, scenario, timeline } = fixture
	const result = project(baseline, scenario, timeline, { cashflowBreakdown: true })
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	const { projection } = result

	it("sells the share, so cash holds 10,000 and pvd 0", () => {
		expect(amounts(rowAt(projection, DAY))).toEqual({ cash: 10_000, pvd: 0 })
		expect(projection.annual[0]).toMatchObject({
			withdrawals: 10_000,
			employerContributions: 10_000,
		})
	})

	it("agrees with the independent day-by-day oracle", () => {
		const oracle = oracleCashflow(fixture)
		expect(oracle.surplus.get("cash")).toBe(10_000n)
		expect(oracle.employer.get("pvd-employer")).toBe(10_000n)
	})

	it("agrees with the independent walk on accessible net worth", () => {
		const walk = oracleAccountWalk(fixture, scenario.flows, timeline.horizon)
		expect(walk.after.get(DAY)).toBe(10_000n)
	})
})

describe("an employer share gated on a Milestone lands from the Milestone", () => {
	const reference = { multiplier: 25, basis: "netWorth", window: "next12Months", terms: "nominal" }
	const options = { method: "survival", minBufferMonths: 6, reference } as SurvivalOptions
	const monthly = { frequency: "monthly", start: "2026-01-01" } as const
	const later: Milestone = {
		id: "later",
		combine: "all",
		criteria: [{ id: "d", kind: "date", on: "2026-04-01" }],
	}
	const gated = makeFixture({
		accounts,
		balances: { cash: 5_000_000, pvd: 0 },
		flows: [
			income("salary", 1_000_000, monthly),
			expense("living", 600_000, monthly),
			employerShare("pvd-employer", "pvd", 200_000, { ...monthly, startAt: "later" }),
		],
		surplus: [{ account: "cash" }],
		withdraw: ["cash", "pvd"],
		start: "2026-01-01",
		horizon: "2034-01-01",
		resolution: "month",
	})
	const fixture = { ...gated, scenario: { ...gated.scenario, milestones: [later] } }

	it("lands from 1 Apr: pvd holds 200,000 after the first, none before", () => {
		const { baseline, scenario, timeline } = fixture
		const result = project(baseline, scenario, { ...timeline, horizon: "2026-04-30" })
		if (!result.ok) throw new Error(JSON.stringify(result.problems))
		expect(amounts(rowAt(result.projection, "2026-03-01"))["pvd"]).toBe(0)
		expect(amounts(rowAt(result.projection, "2026-04-01"))["pvd"]).toBe(200_000)
	})

	// With k months worked the household holds 5,000,000 + 400,000k, the employer has landed k − 3 times
	// (200,000 each), and the 97 monthly dates through 1 Jan 2034 leave 97 − k at −600,000 after the stop.
	// 5,000,000 + 400,000k + 200,000(k − 3) − 600,000(97 − k) ≥ 3,600,000 (6 × 600,000) first holds at k = 48:
	// 57,600,000 − 53,800,000 = 3,800,000, where k = 47 leaves 2,600,000. FI is 1 Jan 2030.
	it("gives FI on 1 Jan 2030, as the brute force finds", () => {
		const { baseline, scenario, timeline } = fixture
		const found = financialIndependence(baseline, scenario, timeline, options)
		if (!found.ok || !found.financialIndependence.reachable) throw new Error("FI not reachable")
		const oracle = oracleAccountFi(fixture, 6)
		expect(oracle).toEqual({ month: "2030-01-01", annualExpenses: 7_200_000n })
		expect(found.financialIndependence.month).toBe("2030-01-01")
	})
})
