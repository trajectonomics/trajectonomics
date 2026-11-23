import { describe, expect, it } from "bun:test"
import { check } from "./index"

const baseline = { schemaVersion: 1, balances: [{ account: "cash", amount: 0 }] }
const timeline = { start: "2026-01-01", horizon: "2027-01-01", resolution: "month" }
const accounts = [
	{ id: "cash", kind: "asset", rate: 0 },
	{ id: "loan", kind: "liability", rate: 600, compounding: "monthly" },
]

/** Malformed loan fields are reported as problems; `check` never throws on them. */
describe("check() on malformed loan fields", () => {
	it.each([
		["a null level", { level: null }],
		["a string level", { level: "100" }],
		["a level of the wrong types", { level: { principal: "1", payments: "12", rounding: 3 } }],
		["a numeric withdrawal source", { kind: "withdrawal", source: 5 }],
	] as const)("returns data for %s", (_name, patch) => {
		const flow = {
			id: "f",
			kind: "contribution",
			target: "loan",
			frequency: "monthly",
			start: "2026-01-31",
			...patch,
		}
		const scenario = {
			schemaVersion: 4,
			currency: "THB",
			economy: { inflation: 0 },
			accounts,
			flows: [flow],
			cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: ["cash"] },
		}
		const problems = check(baseline, scenario, timeline)
		expect(Array.isArray(problems)).toBe(true)
		expect(problems.length).toBeGreaterThan(0)
	})
})
