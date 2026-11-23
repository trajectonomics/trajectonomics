import { describe, expect, it } from "bun:test"
import type { ErrorCode, Path } from "./codes"
import { check } from "./index"

const baseline = { schemaVersion: 1, balances: [{ account: "cash", amount: 0 }] }
const timeline = { start: "2026-01-01", horizon: "2027-01-01", resolution: "month" }

const accounts = [
	{ id: "cash", kind: "asset", rate: 0 },
	{ id: "home", kind: "asset", rate: 0, liquid: false },
	{ id: "vault", kind: "asset", rate: 0, lockedUntil: "2026-06-01" },
	{ id: "loan", kind: "liability", rate: 0 },
]

const fixed = { amount: 500, growth: { bps: 0 } }

function buy(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		id: "buy",
		kind: "contribution",
		target: "home",
		frequency: "once",
		start: "2026-02-01",
		...fixed,
		...overrides,
	}
}

function sell(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		id: "sell",
		kind: "withdrawal",
		source: "home",
		frequency: "once",
		start: "2026-02-01",
		...fixed,
		...overrides,
	}
}

function problemsOf(flows: readonly Record<string, unknown>[], contribute: readonly string[] = []) {
	const scenario = {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts,
		flows,
		cashflow: { surplus: [{ account: "cash" }], contribute, withdraw: ["cash"] },
	}
	return check(baseline, scenario, timeline)
}

function codes(flows: readonly Record<string, unknown>[], contribute: readonly string[] = []) {
	return problemsOf(flows, contribute).map((p) => `${p.code} ${p.path.slice(1).join("/")}`)
}

describe("funding on a Contribution", () => {
	it("accepts an obligation into an asset that cashflow.contribute does not list", () => {
		expect(codes([buy({ funding: "obligation" })])).toEqual([])
	})

	it("still requires routing for a target, written or implied", () => {
		expect(codes([buy({ funding: "target" })])).toEqual(["CONTRIBUTION_UNROUTED flows/0/target"])
		expect(codes([buy()])).toEqual(["CONTRIBUTION_UNROUTED flows/0/target"])
	})

	it("refuses a funding outside the closed list, at funding", () => {
		expect(codes([buy({ funding: "sometimes" })], ["home"])).toEqual([
			"INVALID_FUNDING flows/0/funding",
		])
	})

	it("refuses any funding on a liability target: a debt payment is already an obligation", () => {
		expect(codes([buy({ target: "loan", funding: "obligation" })])).toEqual([
			"INVALID_FUNDING flows/0/funding",
		])
		expect(codes([buy({ target: "loan", funding: "target" })])).toEqual([
			"INVALID_FUNDING flows/0/funding",
		])
	})

	it("refuses funding on an expense, an income and a withdrawal", () => {
		const expense = { id: "e", kind: "expense", frequency: "once", start: "2026-02-01", ...fixed }
		const earned = { ...expense, id: "i", kind: "income", earned: true }
		for (const flow of [expense, earned, sell()]) {
			expect(codes([{ ...flow, funding: "obligation" }])).toEqual([
				"FIELD_NOT_ALLOWED flows/0/funding",
			])
		}
	})
})

describe("a withdrawal from an asset", () => {
	it("accepts a sale from an illiquid asset, and one that reads the whole value of its own source", () => {
		const whole = {
			measures: [{ id: "value", op: "account", account: "home" }],
			result: "value",
		}
		const flow = {
			id: "sell",
			kind: "withdrawal",
			source: "home",
			frequency: "once",
			start: "2026-02-01",
			derive: whole,
		}
		expect(codes([flow])).toEqual([])
		expect(codes([sell()])).toEqual([])
	})

	it("refuses a sale whose first date precedes lockedUntil and waits for no Milestone, at start", () => {
		expect(codes([sell({ source: "vault" })])).toEqual(["WITHDRAWAL_LOCKED flows/0/start"])
	})

	it("accepts a sale that starts on lockedUntil, or waits for a Milestone", () => {
		expect(codes([sell({ source: "vault", start: "2026-06-01" })])).toEqual([])
		const milestones = [
			{ id: "m", combine: "all", criteria: [{ id: "d", kind: "date", on: "2026-03-01" }] },
		]
		const scenario = {
			schemaVersion: 4,
			currency: "THB",
			economy: { inflation: 0 },
			accounts,
			flows: [sell({ source: "vault", startAt: "m" })],
			milestones,
			cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: ["cash"] },
		}
		expect(check(baseline, scenario, timeline)).toEqual([])
	})

	it("still refuses a cycle through a second Flow that changes the Account the sale reads", () => {
		const whole = { measures: [{ id: "v", op: "account", account: "home" }], result: "v" }
		const sale = { ...sell(), amount: undefined, growth: undefined, derive: whole }
		const refill = buy({
			derive: { measures: [{ id: "s", op: "flow", flow: "sell" }], result: "s" },
		})
		const { amount: _a, growth: _g, ...pure } = sale
		const { amount: _b, growth: _h, ...refilled } = refill
		const found = problemsOf([pure, refilled], ["home"]).map((p) => p.code)
		expect(found).toContain("FLOW_CYCLE" satisfies ErrorCode)
	})

	it("reports the path of a locked sale as plain data", () => {
		const path: Path = ["scenario", "flows", 0, "start"]
		expect(problemsOf([sell({ source: "vault" })])).toEqual([{ code: "WITHDRAWAL_LOCKED", path }])
	})
})

describe("a sale beside a next-12-months expense Milestone", () => {
	const cheap = {
		id: "cheap",
		combine: "all",
		criteria: [
			{
				id: "low",
				kind: "metric",
				metric: { expenses: "next12Months" },
				op: "atMost",
				amount: 2_000_000,
				terms: "nominal",
			},
		],
	}
	const whole = { measures: [{ id: "v", op: "account", account: "home" }], result: "v" }
	const wholeSale = {
		id: "sell",
		kind: "withdrawal",
		source: "home",
		frequency: "once",
		start: "2026-02-01",
		derive: whole,
	}
	const plan = (flow: Record<string, unknown>) => ({
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts,
		flows: [flow],
		milestones: [cheap],
		cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: ["cash"] },
	})

	it("refuses a whole-value sale: it reads an Account, and the window cannot forecast the Account", () => {
		expect(check(baseline, plan(wholeSale), timeline)).toEqual([
			{
				code: "NEXT_12_MONTHS_READS_ACCOUNT",
				path: ["scenario", "milestones", 0, "criteria", 0, "metric", "expenses"],
			},
		])
	})

	it("accepts a stated-amount sale, which reads nothing", () => {
		expect(check(baseline, plan(sell()), timeline)).toEqual([])
	})
})
