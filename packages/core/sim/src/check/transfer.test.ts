import { describe, expect, it } from "bun:test"
import { check } from "./index"

const baseline = { schemaVersion: 1, balances: [{ account: "cash", amount: 0 }] }
const timeline = { start: "2026-01-01", horizon: "2027-01-01", resolution: "month" }

const accounts = [
	{ id: "cash", kind: "asset", rate: 0 },
	{ id: "funds", kind: "asset", rate: 0 },
	{ id: "home", kind: "asset", rate: 0, liquid: false },
	{ id: "vault", kind: "asset", rate: 0, lockedUntil: "2026-06-01" },
	{ id: "loan", kind: "liability", rate: 0 },
]

const fixed = { amount: 500, growth: { bps: 0 } }
const wholeSource = {
	derive: { measures: [{ id: "v", op: "account", account: "cash" }], result: "v" },
}

function move(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		id: "move",
		kind: "transfer",
		source: "cash",
		target: "funds",
		frequency: "once",
		start: "2026-02-01",
		...fixed,
		...overrides,
	}
}

function codes(flows: readonly Record<string, unknown>[], extra: Record<string, unknown> = {}) {
	const scenario = {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts,
		flows,
		cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: ["cash"] },
		...extra,
	}
	return check(baseline, scenario, timeline).map((p) => `${p.code} ${p.path.slice(1).join("/")}`)
}

describe("a transfer Flow", () => {
	it("accepts a stated amount, a whole-source amount and a realised one", () => {
		expect(codes([move()])).toEqual([])
		expect(
			codes([move({ amount: undefined, growth: undefined, ...wholeSource })].map(strip)),
		).toEqual([])
		expect(codes([move({ realise: true })])).toEqual([])
	})

	it("accepts a locked or Illiquid target and a liability target, which it pays down", () => {
		expect(codes([move({ target: "vault" }), move({ id: "b", target: "home" })])).toEqual([])
		expect(codes([move({ target: "loan" })])).toEqual([])
	})

	it("refuses an Illiquid source: a sale is a Planned withdrawal", () => {
		expect(codes([move({ source: "home" })])).toEqual(["TRANSFER_FROM_ILLIQUID flows/0/source"])
	})

	it("refuses a liability source: borrowing is a Planned withdrawal", () => {
		expect(codes([move({ source: "loan" })])).toEqual(["TRANSFER_FROM_LIABILITY flows/0/source"])
	})

	it("refuses the same Account as source and target, at the target", () => {
		expect(codes([move({ target: "cash" })])).toEqual(["TRANSFER_SAME_ACCOUNT flows/0/target"])
	})

	it("refuses an unknown source or target, and a missing one", () => {
		expect(codes([move({ source: "nope" })])).toEqual(["UNKNOWN_ACCOUNT flows/0/source"])
		expect(codes([move({ target: "nope" })])).toEqual(["UNKNOWN_ACCOUNT flows/0/target"])
		expect(codes([move({ target: undefined })].map(strip))).toEqual(["MISSING_KEY flows/0/target"])
	})

	it("refuses a fixed date inside the source's lock, as a sale is, unless a Milestone gates it", () => {
		expect(codes([move({ source: "vault" })])).toEqual(["WITHDRAWAL_LOCKED flows/0/start"])
		expect(codes([move({ source: "vault", start: "2026-06-01" })])).toEqual([])
	})

	it("refuses the keys of other Flows: level, rule, funding, label, category, earned", () => {
		const level = { principal: 1, payments: 1, rounding: "floor" }
		expect(codes([move({ level, amount: undefined, growth: undefined })].map(strip))).toEqual([
			"FIELD_NOT_ALLOWED flows/0/level",
		])
		expect(codes([move({ funding: "obligation" })])).toEqual(["FIELD_NOT_ALLOWED flows/0/funding"])
		expect(codes([move({ rule: { kind: "initialRate" } })])).toContain(
			"RULE_NOT_EXPENSE flows/0/rule",
		)
		expect(codes([move({ category: "x" })])).toEqual(["UNKNOWN_KEY flows/0/category"])
		expect(codes([move({ earned: true })])).toEqual(["UNKNOWN_KEY flows/0/earned"])
	})

	it("refuses a `realise` that is not a boolean, and `realise` on any other Flow", () => {
		expect(codes([move({ realise: "yes" })])).toEqual(["WRONG_TYPE flows/0/realise"])
		const sale = {
			id: "s",
			kind: "withdrawal",
			source: "cash",
			frequency: "once",
			start: "2026-02-01",
			...fixed,
		}
		expect(codes([{ ...sale, realise: true }])).toEqual(["UNKNOWN_KEY flows/0/realise"])
	})

	it("refuses an amount form of a kind that is not its own", () => {
		expect(codes([move({ growth: undefined })].map(strip))).toEqual(["MISSING_KEY flows/0/growth"])
		expect(codes([move({ ...wholeSource })])).toEqual(["FIELD_NOT_ALLOWED flows/0/derive"])
	})
})

describe("a transfer that reads an Account", () => {
	it("is no cycle when it reads its own source, since the read precedes every landing", () => {
		const whole = move({ amount: undefined, growth: undefined, ...wholeSource })
		expect(codes([strip(whole)])).toEqual([])
	})

	it("is a cycle when it reads its target, as a Contribution reading its own target is", () => {
		const reads = {
			derive: { measures: [{ id: "v", op: "account", account: "funds" }], result: "v" },
		}
		expect(codes([strip(move({ amount: undefined, growth: undefined, ...reads }))])).toEqual([
			"FLOW_CYCLE flows/0/derive/measures/0/account",
		])
	})

	it("makes both its Accounts changeable, so a next-12-months Metric that reads either is refused", () => {
		const milestone = {
			id: "later",
			combine: "all",
			criteria: [
				{
					id: "low",
					terms: "nominal",
					kind: "metric",
					metric: { expenses: "next12Months" },
					op: "atMost",
					amount: 2_000_000,
				},
			],
		}
		const upkeep = {
			id: "upkeep",
			kind: "expense",
			frequency: "monthly",
			start: "2026-01-01",
			derive: { measures: [{ id: "v", op: "account", account: "funds" }], result: "v" },
		}
		const refused = codes([move(), upkeep], { milestones: [milestone] })
		expect(refused.some((line) => line.startsWith("NEXT_12_MONTHS_READS_ACCOUNT"))).toBe(true)
		expect(codes([upkeep], { milestones: [milestone] })).toEqual([])
	})
})

function strip(flow: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(Object.entries(flow).filter(([, value]) => value !== undefined))
}
