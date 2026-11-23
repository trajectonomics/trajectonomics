import { describe, expect, it } from "bun:test"
import { allowedValues } from "./allowed"
import { check } from "./index"

const baseline = { schemaVersion: 1, balances: [{ account: "cash", amount: 0 }] }
const timeline = { start: "2026-01-01", horizon: "2027-01-01", resolution: "month" }

const accounts = [
	{ id: "cash", kind: "asset", rate: 0 },
	{ id: "brk", kind: "asset", rate: 0 },
	{ id: "home", kind: "asset", rate: 0, liquid: false },
	{ id: "loan", kind: "liability", rate: 0 },
]

function buy(overrides: Record<string, unknown>): Record<string, unknown> {
	return {
		id: "buy",
		kind: "contribution",
		target: "brk",
		funding: "obligation",
		frequency: "once",
		start: "2026-02-01",
		amount: 1000,
		growth: { bps: 0 },
		...overrides,
	}
}

function codes(flow: Record<string, unknown>, withdraw: readonly string[]): string[] {
	const scenario = {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts,
		flows: [flow],
		cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw },
	}
	return check(baseline, scenario, timeline).map((p) => `${p.code} ${p.path.slice(1).join("/")}`)
}

// Booked into `brk` first, the day's negative net of 1,000 could be drawn straight back out of `brk`:
// 0 + 1,000 − 1,000 = 0, no Shortfall, and the purchase paid for itself. `check()` refuses it.
describe("an obligation into an Account that cashflow.withdraw lists", () => {
	it("is refused at the Flow's target, wherever the Account sits in the list", () => {
		for (const withdraw of [["brk", "cash"], ["cash", "brk"], ["brk"]]) {
			expect(codes(buy({}), withdraw)).toEqual(["OBLIGATION_TARGET_WITHDRAWN flows/0/target"])
		}
	})

	it("is accepted into an Account the list does not name: a home, or a brokerage beside cash", () => {
		expect(codes(buy({ target: "home" }), ["brk", "cash"])).toEqual([])
		expect(codes(buy({ target: "brk" }), ["cash"])).toEqual([])
	})

	it("leaves a target Contribution into a listed Account alone: that is today's rule", () => {
		const target = buy({ funding: "target" })
		expect(codes(target, ["brk", "cash"])).toEqual(["CONTRIBUTION_UNROUTED flows/0/target"])
	})
})

describe("one mistake is one refusal", () => {
	it("reports an illiquid target in withdraw as ILLIQUID_ROUTED alone", () => {
		expect(codes(buy({ target: "home" }), ["home", "cash"])).toEqual([
			"ILLIQUID_ROUTED cashflow/withdraw/0",
		])
	})

	it("reports an unknown funding on an asset as INVALID_FUNDING alone, though contribute is empty", () => {
		expect(codes(buy({ funding: "bogus" }), ["cash"])).toEqual(["INVALID_FUNDING flows/0/funding"])
	})

	it("still reports an unrouted target Contribution when funding is absent or target", () => {
		const unrouted = ["CONTRIBUTION_UNROUTED flows/0/target"]
		expect(codes(buy({ funding: "target" }), ["cash"])).toEqual(unrouted)
		const { funding: _, ...absent } = buy({})
		expect(codes(absent, ["cash"])).toEqual(unrouted)
	})
})

describe("funding on a liability", () => {
	it("is FUNDING_ON_LIABILITY for a known value, and lists no allowed values", () => {
		expect(codes(buy({ target: "loan" }), ["cash"])).toEqual([
			"FUNDING_ON_LIABILITY flows/0/funding",
		])
		expect(allowedValues("FUNDING_ON_LIABILITY", ["flows", 0, "funding"])).toBeUndefined()
		expect(allowedValues("OBLIGATION_TARGET_WITHDRAWN", ["flows", 0, "target"])).toBeUndefined()
	})

	it("is INVALID_FUNDING once for an unknown value, and names target and obligation", () => {
		expect(codes(buy({ target: "loan", funding: "bogus" }), ["cash"])).toEqual([
			"INVALID_FUNDING flows/0/funding",
		])
		expect(allowedValues("INVALID_FUNDING", ["flows", 0, "funding"])).toEqual([
			"target",
			"obligation",
		])
	})
})
