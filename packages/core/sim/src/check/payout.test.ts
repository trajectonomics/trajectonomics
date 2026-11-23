import { describe, expect, it } from "bun:test"
import { allowedValues } from "./allowed"
import { check } from "./index"

const baseline = { schemaVersion: 1, balances: [{ account: "cash", amount: 0 }] }
const timeline = { start: "2026-01-01", horizon: "2027-01-01", resolution: "month" }
const payout = { bps: 350, frequency: "quarterly", rounding: "halfUp" }

const levy = {
	id: "tax",
	period: { month: 1, day: 1 },
	settlement: { month: 3, day: 31 },
	measures: [
		{ id: "gross", op: "tally", label: "dividends", basis: "gross" },
		{ id: "gains", op: "tally", label: "gain", basis: "gains" },
		{ id: "sum", op: "add", a: "gross", b: "gains" },
	],
	due: "sum",
	carryIn: [{ periodStart: "2025-01-01", tallies: [], prepaid: 0 }],
}

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

const taxed = { levies: [levy] }
const pays = (fields: Record<string, unknown>) => ({ payout: { ...payout, ...fields } })

describe("an Account's payout", () => {
	it("is accepted with a label and a prepayment under a Levy, and with a window", () => {
		const full = pays({
			label: "dividends",
			prepayments: [{ levy: "tax", bps: 1000 }],
			start: "2026-04-01",
		})
		expect(codes(full, taxed)).toEqual([])
		expect(codes(pays({ bps: 0 }))).toEqual([])
		expect(
			codes(pays({ bps: 10_000, frequency: "monthly", rounding: "floor", end: "2026-12-31" })),
		).toEqual([])
	})

	it("refuses a share outside 0 to 10000 bps, an unknown frequency and an unknown rounding", () => {
		expect(codes(pays({ bps: 10_001 }))).toEqual(["RATE_OUT_OF_RANGE accounts/1/payout/bps"])
		expect(codes(pays({ bps: -1 }))).toEqual(["RATE_OUT_OF_RANGE accounts/1/payout/bps"])
		expect(codes(pays({ frequency: "weekly" }))).toEqual([
			"INVALID_FREQUENCY accounts/1/payout/frequency",
		])
		expect(codes(pays({ rounding: "up" }))).toEqual(["INVALID_ROUNDING accounts/1/payout/rounding"])
	})

	it("lists the calendar periods as a payout's allowed frequencies, not a Flow's", () => {
		const path = ["scenario", "accounts", 1, "payout", "frequency"]
		expect(allowedValues("INVALID_FREQUENCY", path)).toEqual([
			"monthly",
			"quarterly",
			"semiannual",
			"annual",
		])
		expect(allowedValues("INVALID_FREQUENCY", ["scenario", "flows", 0, "frequency"])).toContain(
			"once",
		)
	})

	it("needs its rounding and share, and takes no other key", () => {
		expect(codes({ payout: { frequency: "annual" } })).toEqual([
			"MISSING_KEY accounts/1/payout/bps",
			"MISSING_KEY accounts/1/payout/rounding",
		])
		expect(codes(pays({ rate: 1 }))).toEqual(["UNKNOWN_KEY accounts/1/payout/rate"])
	})

	it("refuses a label or a prepayment without a Levy, and a prepayment of an unknown Levy", () => {
		expect(codes(pays({ label: "dividends" }))).toEqual(["LEVY_REQUIRED accounts/1/payout/label"])
		const shares = pays({ prepayments: [{ levy: "tax", bps: 1000 }] })
		expect(codes(shares)).toEqual(["LEVY_REQUIRED accounts/1/payout/prepayments"])
		expect(
			codes(pays({ label: "dividends", prepayments: [{ levy: "other", bps: 1000 }] }), taxed),
		).toEqual(["UNKNOWN_LEVY accounts/1/payout/prepayments/0/levy"])
	})

	it("refuses a window that ends before it starts and a Milestone that is not declared", () => {
		expect(codes(pays({ start: "2026-06-01", end: "2026-05-01" }))).toEqual([
			"END_BEFORE_START accounts/1/payout/end",
		])
		expect(codes(pays({ startAt: "retire" }))).toEqual([
			"UNKNOWN_MILESTONE accounts/1/payout/startAt",
		])
	})
})

describe("what an Account may not do beside a payout", () => {
	it("refuses a payout on an Illiquid asset: PAYOUT_ILLIQUID", () => {
		expect(codes({ ...pays({}), liquid: false })).toEqual(["PAYOUT_ILLIQUID accounts/1/payout"])
	})

	it("refuses a payout on a liability: LIABILITY_MISUSE", () => {
		expect(codes({ kind: "liability", ...pays({}) })).toEqual([
			"LIABILITY_MISUSE accounts/1/payout",
		])
	})

	it("refuses a payout label beside returnLabel: CONFLICTING_LABELS, but accepts it beside gainLabel", () => {
		const labelled = pays({ label: "dividends" })
		expect(codes({ ...labelled, returnLabel: "growth" }, taxed)).toEqual([
			"CONFLICTING_LABELS accounts/1/payout/label",
		])
		expect(codes({ ...labelled, gainLabel: "gain" }, taxed)).toEqual([])
	})

	it("takes the Flow id payout:<account>, so a declared Flow with it is a duplicate", () => {
		const flow = {
			id: "payout:fund",
			kind: "expense",
			frequency: "once",
			start: "2026-02-01",
			amount: 1,
			growth: { bps: 0 },
		}
		expect(codes(pays({}), { flows: [flow] })).toEqual(["DUPLICATE_ID flows/0/id"])
		expect(codes({}, { flows: [flow] })).toEqual([])
	})

	it("supplies the Levy's gross Tally with its label, so a Levy that reads only it is supplied", () => {
		const reads = { levies: [{ ...levy, measures: [levy.measures[0]], due: "gross" }] }
		expect(codes(pays({ label: "dividends" }), reads)).toEqual([])
		expect(codes(pays({}), reads)).toEqual(["UNSUPPLIED_TALLY_LABEL levies/0"])
	})
})
