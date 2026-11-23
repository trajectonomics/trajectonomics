import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import type { Estate, Projection } from "../types"
import { BALANCES, household, withEstate } from "./test-household"

const block: Estate = {
	costs: [
		{ id: "settlement", of: "gross", bps: 200, rounding: "halfUp" },
		{ id: "lawyer", amount: 100_000, growth: "inflation" },
	],
	gifts: [{ id: "temple", of: "net", bps: 1000, rounding: "floor" }],
}

function projected(fixture: Fixture, estate?: boolean): Projection {
	const { baseline, scenario, timeline } = fixture
	const result = project(baseline, scenario, timeline, estate === undefined ? {} : { estate })
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.projection
}

describe("the estate block is inert", () => {
	const plain = household()
	const planned = withEstate(plain, block)

	it("gives byte-identical Projection without the option, with or without the block", () => {
		expect(JSON.stringify(projected(planned))).toBe(JSON.stringify(projected(plain)))
		expect("estate" in projected(planned)).toBe(false)
	})

	it("changes nothing but the new statement when asked for it", () => {
		const { estate, ...rest } = projected(planned, true)
		expect(estate).toHaveLength(projected(plain).rows.length)
		expect(JSON.stringify(rest)).toBe(JSON.stringify(projected(plain)))
		expect(JSON.stringify(projected(plain, true).rows)).toBe(JSON.stringify(projected(plain).rows))
	})

	it("states gross − debts for a plan with no block, with empty costs and gifts", () => {
		const at = projected(plain, true).estate![0]!
		expect(at).toEqual({
			date: "2026-01-01",
			gross: 8_000_000,
			debts: 3_000_000,
			costs: [],
			costsTotal: 0,
			net: 5_000_000,
			gifts: [],
			giftsTotal: 0,
			toHeirs: 5_000_000,
			real: { net: 5_000_000, toHeirs: 5_000_000 },
		})
	})
})

describe("a plan that runs out", () => {
	const broke: Fixture = makeFixture({
		accounts: [{ id: "cash", kind: "asset", rate: 0 }],
		balances: { cash: 300_000 },
		flows: [
			income("pay", 100_000, { frequency: "monthly", start: "2026-01-01" }),
			expense("rent", 200_000, { frequency: "monthly", start: "2026-01-01" }),
		],
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2028-01-01",
		resolution: "month",
	})

	it("ends on the runs-out date, with what is left", () => {
		const plan = withEstate(broke, { costs: [{ id: "fee", amount: 50_000, growth: { bps: 0 } }] })
		const { runsOut, estate } = projected(plan, true)
		expect(runsOut).toBeDefined()
		const last = estate!.at(-1)!
		expect(last.date).toBe(runsOut!.date)
		expect([last.gross, last.net, last.toHeirs]).toEqual([0, -50_000, 0])
	})
})

describe("an amount past the safe integers", () => {
	it("is VALUE_OVERFLOW on the row's date, not a throw", () => {
		const huge = { amount: Number.MAX_SAFE_INTEGER, growth: { bps: 0 } } as const
		const plan = withEstate(household(BALANCES), {
			costs: [
				{ id: "a", ...huge },
				{ id: "b", ...huge },
			],
		})
		const result = project(plan.baseline, plan.scenario, plan.timeline, { estate: true })
		expect(result).toEqual({
			ok: false,
			problems: [{ code: "VALUE_OVERFLOW", date: "2026-01-01" }],
		})
	})
})
