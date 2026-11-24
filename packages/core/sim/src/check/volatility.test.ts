import { describe, expect, it } from "bun:test"
import { project } from "../engine/project"
import { makeFixture } from "../engine/test-helpers"
import { check } from "./index"

const baseline = { schemaVersion: 1, balances: [{ account: "fund", amount: 1_000_000 }] }
const timeline = { start: "2026-01-01", horizon: "2027-01-01", resolution: "month" }

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
})
