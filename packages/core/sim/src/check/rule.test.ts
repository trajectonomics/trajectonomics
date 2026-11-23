import { describe, expect, it } from "bun:test"
import type { Problem } from "./codes"
import { check } from "./index"

const baseline = {
	schemaVersion: 1,
	balances: [
		{ account: "cash", amount: 5_000_000_000 },
		{ account: "inv", amount: 100_000_000 },
		{ account: "home", amount: 500_000_000 },
		{ account: "loan", amount: 1_000_000 },
	],
}
const timeline = { start: "2026-01-01", horizon: "2031-01-01", resolution: "month" }
const accounts = [
	{ id: "cash", kind: "asset", rate: 0 },
	{ id: "inv", kind: "asset", rate: 300 },
	{ id: "home", kind: "asset", rate: 300, liquid: false },
	{ id: "loan", kind: "liability", rate: 400 },
]
const rule = { kind: "currentRate", portfolio: ["inv"], rateBps: 400, rounding: "halfUp" }
const spend = { id: "spend", kind: "expense", frequency: "monthly", start: "2026-01-01", rule }
const cashflow = { surplus: [{ account: "cash" }], contribute: [], withdraw: ["cash"] }

function found(flow: object, flows: readonly object[] = []): readonly Problem[] {
	const scenario = {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts,
		flows: [flow, ...flows],
		cashflow,
	}
	return check(baseline, scenario, timeline)
}

const withRule = (changes: object, flow: object = spend) => ({
	...flow,
	rule: { ...rule, ...changes },
})
const at = (key: string, ...more: (string | number)[]) => [
	"scenario",
	"flows",
	0,
	"rule",
	key,
	...more,
]

describe("check() on a Flow's `rule`", () => {
	it("accepts each kind", () => {
		const guard = { kind: "guardrails", upper: { bps: 2000, adjustBps: 1000 } }
		expect(found(spend)).toEqual([])
		expect(found(withRule({ kind: "initialRate" }))).toEqual([])
		expect(found(withRule(guard))).toEqual([])
		expect(found({ ...spend, frequency: "annual" })).toEqual([])
	})

	it("refuses a rule on an income Flow at the `rule` key: RULE_NOT_EXPENSE", () => {
		const income = { ...spend, kind: "income", earned: true }
		expect(found(income)).toEqual([
			{ code: "RULE_NOT_EXPENSE", path: ["scenario", "flows", 0, "rule"] },
		])
	})

	it("refuses a liability, an Illiquid asset and an unknown Account in the portfolio", () => {
		expect(found(withRule({ portfolio: ["inv", "loan"] }))).toEqual([
			{ code: "RULE_PORTFOLIO_LIABILITY", path: at("portfolio", 1) },
		])
		expect(found(withRule({ portfolio: ["home"] }))).toEqual([
			{ code: "RULE_PORTFOLIO_ILLIQUID", path: at("portfolio", 0) },
		])
		expect(found(withRule({ portfolio: ["nope"] }))).toEqual([
			{ code: "UNKNOWN_ACCOUNT", path: at("portfolio", 0) },
		])
	})

	it("refuses a weekly Flow at `frequency`: RULE_FREQUENCY", () => {
		expect(found({ ...spend, frequency: "weekly" })).toEqual([
			{ code: "RULE_FREQUENCY", path: ["scenario", "flows", 0, "frequency"] },
		])
	})

	it("refuses a rate of 0 or above 10000, a missing rounding and an unknown kind", () => {
		expect(found(withRule({ rateBps: 0 })).map((p) => p.code)).toEqual(["RATE_OUT_OF_RANGE"])
		expect(found(withRule({ rateBps: 10_001 })).map((p) => p.code)).toEqual(["RATE_OUT_OF_RANGE"])
		const { rounding: _, ...bare } = rule
		expect(found({ ...spend, rule: bare })).toEqual([{ code: "MISSING_KEY", path: at("rounding") }])
		expect(found(withRule({ kind: "x" }))).toEqual([{ code: "INVALID_KIND", path: at("kind") }])
	})

	it("refuses a floor above the ceiling at the floor, and rate steps that do not ascend", () => {
		const bound = (amount: number) => ({ amount, growth: { bps: 0 } })
		expect(found(withRule({ floor: bound(5), ceiling: bound(4) }))).toEqual([
			{ code: "RULE_FLOOR_ABOVE_CEILING", path: at("floor") },
		])
		const steps = [
			{ from: "2027-01-01", bps: 500 },
			{ from: "2027-01-01", bps: 600 },
		]
		expect(found(withRule({ steps }))).toEqual([
			{ code: "STEPS_NOT_ASCENDING", path: at("steps", 1, "from") },
		])
	})

	it("needs `upper` or `lower` for guardrails, and refuses a second amount form beside a rule", () => {
		expect(found(withRule({ kind: "guardrails" }))).toEqual([
			{ code: "MISSING_KEY", path: at("upper") },
		])
		const fixed = found({ ...spend, amount: 1, growth: { bps: 0 } })
		expect(fixed).toEqual([{ code: "FIELD_NOT_ALLOWED", path: ["scenario", "flows", 0, "rule"] }])
	})

	it("refuses a `next12Months` Milestone beside any rule Flow, even on an Account nothing changes", () => {
		const next = { expenses: "next12Months" }
		const milestone = {
			id: "cheap",
			combine: "all",
			criteria: [
				{ id: "low", terms: "nominal", kind: "metric", metric: next, op: "atMost", amount: 1 },
			],
		}
		const scenario = {
			schemaVersion: 4,
			currency: "THB",
			economy: { inflation: 0 },
			accounts,
			flows: [spend],
			milestones: [milestone],
			cashflow,
		}
		expect(check(baseline, scenario, timeline)).toEqual([
			{
				code: "NEXT_12_MONTHS_READS_ACCOUNT",
				path: ["scenario", "milestones", 0, "criteria", 0, "metric", "expenses"],
			},
		])
	})
})
