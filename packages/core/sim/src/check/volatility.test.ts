import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import { financialIndependence } from "../index"
import type { Account, FinancialIndependenceOptions, ReturnModel } from "../types"
import { check } from "./index"

const baseline = { schemaVersion: 1, balances: [{ account: "fund", amount: 1_000_000 }] }
const timeline = { start: "2026-01-01", horizon: "2027-01-01", resolution: "month" }
const SEED = "0000000000000000"
const FULL = 4294967296
const ASSETS: Account[] = [
	{ id: "cash", kind: "asset", rate: 0 },
	{ id: "fund", kind: "asset", rate: 800 },
]
/** Hand-written: the same model for every run, so only the Accounts' volatility varies. */
const MODEL: ReturnModel = {
	id: "hand",
	accounts: ["cash", "fund"],
	buckets: [
		{ returnsBps: [0, -1000], weight: FULL / 2 },
		{ returnsBps: [0, 1000], weight: FULL / 2 },
	],
}
const OPTIONS: Record<string, FinancialIndependenceOptions> = {
	survival: { method: "survival" },
	probability: { method: "probabilityThreshold", thresholdBps: 5000, paths: 10, seed: SEED },
}

function scenario(account: Record<string, unknown>) {
	return {
		schemaVersion: 4,
		currency: "THB",
		economy: { inflation: 0 },
		accounts: [{ id: "fund", kind: "asset", rate: 800, ...account }],
		flows: [],
		cashflow: { surplus: [{ account: "fund" }], contribute: [], withdraw: ["fund"] },
	}
}

/** The codes and paths `check()` gives a Scenario whose `fund` Account is the given one. */
function codes(account: Record<string, unknown>) {
	return check(baseline, scenario(account), timeline).map(
		(p) => `${p.code} ${p.path.slice(1).join("/")}`,
	)
}

describe("an Account's volatility", () => {
	it("is accepted from 0 to 10000 bps on an asset", () => {
		for (const volatility of [0, 1500, 10_000]) expect(codes({ volatility })).toEqual([])
	})

	it("refuses a value outside 0 to 10000, a fraction and a text, all NOT_SAFE_INTEGER or RATE_OUT_OF_RANGE", () => {
		expect(codes({ volatility: 10_001 })).toEqual(["RATE_OUT_OF_RANGE accounts/0/volatility"])
		expect(codes({ volatility: -1 })).toEqual(["RATE_OUT_OF_RANGE accounts/0/volatility"])
		expect(codes({ volatility: 1.5 })).toEqual(["NOT_SAFE_INTEGER accounts/0/volatility"])
		expect(codes({ volatility: "high" })).toEqual(["NOT_SAFE_INTEGER accounts/0/volatility"])
	})

	it("is refused on a liability: LIABILITY_MISUSE", () => {
		expect(codes({ kind: "liability", volatility: 1500 })).toContain(
			"LIABILITY_MISUSE accounts/0/volatility",
		)
	})

	it("is inert to project(): the Projection is the same with and without it", () => {
		const run = (extra: object) => {
			const { baseline, scenario, timeline } = makeFixture({
				accounts: [{ id: "fund", kind: "asset", rate: 800, ...extra }],
				balances: { fund: 1_000_000 },
				surplus: [{ account: "fund" }],
				withdraw: ["fund"],
			})
			return project(baseline, scenario, timeline)
		}
		const bare = run({})
		expect(bare.ok).toBe(true)
		expect(JSON.stringify(run({ volatility: 3000 }))).toBe(JSON.stringify(bare))
	})

	describe("financialIndependence", () => {
		/** One two-asset fixture; `volatile` names the Accounts that carry a volatility. */
		function fi(volatile: readonly string[], options: FinancialIndependenceOptions) {
			const accounts = ASSETS.map((account) =>
				volatile.includes(account.id) ? { ...account, volatility: 1500 } : account,
			)
			const { baseline, scenario, timeline } = makeFixture({
				accounts,
				balances: { cash: 0, fund: 100_000 },
				flows: [
					income("pay", 100, { frequency: "monthly" }),
					expense("living", 50, { frequency: "monthly" }),
				],
				surplus: [{ account: "cash" }],
				withdraw: ["cash", "fund"],
				resolution: "month",
				horizon: "2030-01-01",
			})
			return financialIndependence(baseline, scenario, timeline, options, MODEL)
		}

		for (const [method, options] of Object.entries(OPTIONS)) {
			it(`gives the same ${method} result with volatility on any asset or on all of them`, () => {
				const bare = fi([], options)
				expect(bare.ok).toBe(true)
				for (const volatile of [["cash"], ["fund"], ["cash", "fund"]]) {
					expect(JSON.stringify(fi(volatile, options))).toBe(JSON.stringify(bare))
				}
			})
		}
	})
})
