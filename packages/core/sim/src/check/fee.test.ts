import { describe, expect, it } from "bun:test"
import { check } from "./index"

const baseline = { schemaVersion: 1, balances: [{ account: "cash", amount: 0 }] }
const timeline = { start: "2026-01-01", horizon: "2027-01-01", resolution: "month" }
const fee = { bps: 150, rounding: "halfUp" }

/** The codes and paths `check()` gives a Scenario whose `fund` Account is the given one. */
function codes(account: Record<string, unknown>, extra: Record<string, unknown> = {}) {
	const scenario = {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts: [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "fund", kind: "asset", rate: 800, ...account },
		],
		flows: [],
		cashflow: { surplus: [{ account: "cash" }], contribute: [], withdraw: ["cash"] },
		...extra,
	}
	return check(baseline, scenario, timeline).map((p) => `${p.code} ${p.path.slice(1).join("/")}`)
}

describe("an Account's fee", () => {
	it("is accepted, a fee of 0 and of 10000 bps and on a locked or an Illiquid asset included", () => {
		expect(codes({ fee })).toEqual([])
		expect(codes({ fee: { ...fee, bps: 0 } })).toEqual([])
		expect(codes({ fee: { bps: 10_000, rounding: "floor" } })).toEqual([])
		expect(codes({ fee, lockedUntil: "2030-01-01" })).toEqual([])
		expect(codes({ fee, liquid: false })).toEqual([])
	})

	it("refuses a share outside 0 to 10000 bps, an unknown rounding, a missing key and an unknown key", () => {
		expect(codes({ fee: { ...fee, bps: 10_001 } })).toEqual([
			"RATE_OUT_OF_RANGE accounts/1/fee/bps",
		])
		expect(codes({ fee: { ...fee, bps: -1 } })).toEqual(["RATE_OUT_OF_RANGE accounts/1/fee/bps"])
		expect(codes({ fee: { ...fee, rounding: "up" } })).toEqual([
			"INVALID_ROUNDING accounts/1/fee/rounding",
		])
		expect(codes({ fee: { bps: 150 } })).toEqual(["MISSING_KEY accounts/1/fee/rounding"])
		expect(codes({ fee: { ...fee, frequency: "monthly" } })).toEqual([
			"UNKNOWN_KEY accounts/1/fee/frequency",
		])
	})

	it("refuses a fee on a liability: LIABILITY_MISUSE", () => {
		expect(codes({ kind: "liability", fee })).toEqual(["LIABILITY_MISUSE accounts/1/fee"])
	})

	it("takes the Flow id fee:<account>, so a declared Flow with it is a duplicate", () => {
		const flow = {
			id: "fee:fund",
			kind: "expense",
			frequency: "once",
			start: "2026-02-01",
			amount: 1,
			growth: { bps: 0 },
		}
		expect(codes({ fee }, { flows: [flow] })).toEqual(["DUPLICATE_ID flows/0/id"])
		expect(codes({}, { flows: [flow] })).toEqual([])
		// A fee of 0 bps is no fee (ADR 0028), so it takes no id.
		expect(codes({ fee: { ...fee, bps: 0 } }, { flows: [flow] })).toEqual([])
		// The id is the Account's own: another Account's fee does not take it.
		expect(codes({ fee }, { flows: [{ ...flow, id: "fee:cash" }] })).toEqual([])
	})
})
