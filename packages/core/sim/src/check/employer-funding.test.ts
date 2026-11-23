import { describe, expect, it } from "bun:test"
import { check } from "./index"

const baseline = { schemaVersion: 1, balances: [{ account: "cash", amount: 0 }] }
const timeline = { start: "2026-01-01", horizon: "2027-01-01", resolution: "month" }

const accounts = [
	{ id: "cash", kind: "asset", rate: 0 },
	{ id: "pvd", kind: "asset", rate: 0, lockedUntil: "2030-01-01" },
	{ id: "home", kind: "asset", rate: 0, liquid: false },
	{ id: "loan", kind: "liability", rate: 0, compounding: "monthly" },
]

function share(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		id: "pvd-employer",
		kind: "contribution",
		target: "pvd",
		funding: "employer",
		frequency: "monthly",
		start: "2026-01-31",
		amount: 500,
		growth: { bps: 0 },
		...overrides,
	}
}

function codes(flow: Record<string, unknown>, withdraw: readonly string[] = ["cash"]) {
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

describe("an employer Contribution", () => {
	it("is accepted into a locked asset that is not routed, and into one the withdraw list names", () => {
		expect(codes(share())).toEqual([])
		expect(codes(share(), ["pvd", "cash"])).toEqual([])
	})

	it("is accepted with a derived amount", () => {
		const derive = { measures: [{ id: "none", op: "const", value: 1 }], result: "none" }
		const { amount: _amount, growth: _growth, ...derived } = share()
		expect(codes({ ...derived, derive })).toEqual([])
	})

	it("into a liability is EMPLOYER_INTO_LIABILITY alone, not FUNDING_ON_LIABILITY", () => {
		expect(codes(share({ target: "loan" }))).toEqual(["EMPLOYER_INTO_LIABILITY flows/0/funding"])
	})

	it("into an Illiquid asset is EMPLOYER_INTO_ILLIQUID", () => {
		expect(codes(share({ target: "home" }))).toEqual(["EMPLOYER_INTO_ILLIQUID flows/0/funding"])
	})

	it("refuses a rule amount as RULE_NOT_EXPENSE", () => {
		const { amount: _amount, growth: _growth, ...ruled } = share()
		expect(codes({ ...ruled, rule: { kind: "fixed" } })).toEqual(["RULE_NOT_EXPENSE flows/0/rule"])
	})

	it("refuses a level amount, which belongs to a loan payment", () => {
		const { amount: _amount, growth: _growth, ...levelled } = share()
		const level = { principal: 1000, payments: 12, rounding: "halfUp" }
		expect(codes({ ...levelled, level })).toEqual(["LEVEL_TARGET_NOT_LIABILITY flows/0/target"])
	})
})
