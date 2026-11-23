import { describe, expect, it } from "bun:test"
import { allowedValues } from "./allowed"
import type { Problem } from "./codes"
import { check } from "./index"

const baseline = {
	schemaVersion: 1,
	balances: [
		{ account: "cash", amount: 1_000 },
		{ account: "home", amount: 5_000 },
		{ account: "loan", amount: 2_000 },
	],
}
const timeline = { start: "2026-01-01", horizon: "2031-01-01", resolution: "month" }
const accounts = [
	{ id: "cash", kind: "asset", rate: 0 },
	{ id: "home", kind: "asset", rate: 0, liquid: false },
	{ id: "loan", kind: "liability", rate: 0 },
]

function found(estate: unknown): readonly Problem[] {
	const scenario = {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts,
		flows: [],
		cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: [] },
		estate,
	}
	return check(baseline, scenario, timeline)
}

const at = (...path: (string | number)[]) => ["scenario", "estate", ...path]
const share = { id: "s", of: "gross", bps: 200, rounding: "halfUp" }

describe("check() on the estate block", () => {
	it("accepts the issue's block, an empty one, and a share of an Illiquid home", () => {
		expect(
			found({
				costs: [
					share,
					{ id: "sale", of: { accounts: ["home"] }, bps: 500, rounding: "halfUp" },
					{ id: "lawyer", amount: 5_000, growth: "inflation" },
				],
				gifts: [{ id: "temple", of: "net", bps: 1000, rounding: "floor" }],
			}),
		).toEqual([])
		expect(found({})).toEqual([])
	})

	it("refuses an id used twice across costs and gifts", () => {
		expect(found({ costs: [share, { ...share }], gifts: [{ ...share, of: "net" }] })).toEqual([
			{ code: "DUPLICATE_ID", path: at("costs", 1, "id") },
			{ code: "DUPLICATE_ID", path: at("gifts", 0, "id") },
		])
	})

	it("names an unknown Account and a liability at their own path", () => {
		const of = { accounts: ["cash", "ghost", "loan"] }
		expect(found({ costs: [{ ...share, of }] })).toEqual([
			{ code: "UNKNOWN_ACCOUNT", path: at("costs", 0, "of", "accounts", 1) },
			{ code: "ESTATE_ACCOUNT_LIABILITY", path: at("costs", 0, "of", "accounts", 2) },
		])
	})

	it("refuses an empty or repeated Account list", () => {
		expect(found({ costs: [{ ...share, of: { accounts: [] } }] })).toEqual([
			{ code: "MISSING_KEY", path: at("costs", 0, "of", "accounts") },
		])
		expect(found({ costs: [{ ...share, of: { accounts: ["cash", "cash"] } }] })).toEqual([
			{ code: "DUPLICATE_ID", path: at("costs", 0, "of", "accounts", 1) },
		])
	})

	it("refuses bps outside 0..10000, a missing rounding, a wrong base and unknown keys", () => {
		expect(found({ gifts: [{ id: "g", of: "net", bps: 10_001, rounding: "floor" }] })).toEqual([
			{ code: "RATE_OUT_OF_RANGE", path: at("gifts", 0, "bps") },
		])
		expect(found({ costs: [{ id: "c", of: "gross", bps: 100 }] })).toEqual([
			{ code: "MISSING_KEY", path: at("costs", 0, "rounding") },
		])
		expect(found({ gifts: [{ id: "g", of: "gross", bps: 1, rounding: "floor" }] })).toEqual([
			{ code: "INVALID_BASIS", path: at("gifts", 0, "of") },
		])
		expect(found({ costs: [{ ...share, of: "net" }] })).toEqual([
			{ code: "INVALID_BASIS", path: at("costs", 0, "of") },
		])
		expect(found({ costs: [{ ...share, tax: 1 }], extra: [] })).toEqual([
			{ code: "UNKNOWN_KEY", path: at("extra") },
			{ code: "UNKNOWN_KEY", path: at("costs", 0, "tax") },
		])
	})

	it("checks a fixed line's amount, growth and keys, and refuses a share beside an amount", () => {
		const fixed = { id: "f", amount: 100, growth: "inflation" }
		expect(found({ costs: [{ ...fixed, amount: -1 }] })).toEqual([
			{ code: "NEGATIVE_AMOUNT", path: at("costs", 0, "amount") },
		])
		expect(found({ gifts: [{ id: "f", amount: 100 }] })).toEqual([
			{ code: "MISSING_KEY", path: at("gifts", 0, "growth") },
		])
		expect(found({ gifts: [{ ...fixed, bps: 5 }] })).toEqual([
			{ code: "UNKNOWN_KEY", path: at("gifts", 0, "bps") },
		])
	})

	it("lists the base a wrong `of` accepts", () => {
		expect(allowedValues("INVALID_BASIS", at("costs", 0, "of"))).toEqual(["gross"])
		expect(allowedValues("INVALID_BASIS", at("gifts", 0, "of"))).toEqual(["net"])
	})
})
