import { describe, expect, it } from "bun:test"
import { makeFixture, type Setup } from "../engine/test-helpers"
import { homeSetup } from "../fixtures/home-setup"
import { financialIndependence } from "../index"

function fi(setup: Setup, minBufferMonths = 1) {
	const { baseline, scenario, timeline } = makeFixture(setup)
	return financialIndependence(baseline, scenario, timeline, {
		method: "survival",
		minBufferMonths,
	})
}

const marked = { id: "home", kind: "asset", rate: 0, liquid: false } as const
const unmarked = { id: "home", kind: "asset", rate: 0 } as const

describe("a home left out of accessible net worth moves the FI month", () => {
	it("gives 1 Jan 2026 when the home counts toward the buffer", () => {
		// Stop on 1 Jan: cash 300 → 200 → 100 → 0. Accessible with the home is at least 6,000, so
		// every check passes and no Shortfall occurs. FI is reached on the first candidate.
		const result = fi(homeSetup(unmarked))
		expect(result).toMatchObject({
			ok: true,
			financialIndependence: { reachable: true, month: "2026-01-01" },
		})
	})

	it("gives 1 Feb 2026 when the home is marked, because 1 Jan fails the buffer on 1 Mar", () => {
		// Stop on 1 Jan: accessible is cash alone: 200 on 1 Jan (≥ 100), 100 on 1 Feb (≥ 100),
		// and 0 on 1 Mar (< 100, a breach). So 1 Jan is not FI.
		// Stop on 1 Feb: 1 Jan lands 300 + 500 − 100 = 700. On 1 Feb earned stops: 700 − 100 = 600
		// (≥ 100), and on 1 Mar 600 − 100 = 500 (≥ 100). No Shortfall, no breach: FI is 1 Feb.
		const result = fi(homeSetup(marked))
		expect(result).toMatchObject({
			ok: true,
			financialIndependence: { reachable: true, month: "2026-02-01" },
		})
	})

	it("leaves the FI month alone without a Minimum buffer, whether the home is marked or not", () => {
		// With no buffer only a Shortfall can refuse a month, and the home is never drawn: both
		// plans reach FI on 1 Jan 2026, so the mark moves the answer only through the buffer.
		for (const home of [marked, unmarked]) {
			expect(fi(homeSetup(home), 0)).toMatchObject({
				financialIndependence: { reachable: true, month: "2026-01-01" },
			})
		}
	})

	it("treats liquid: true exactly as an omitted liquid key", () => {
		const explicit = fi(homeSetup({ ...unmarked, liquid: true } as const))
		expect(explicit).toEqual(fi(homeSetup(unmarked)))
	})
})

describe("the rule-of-thumb reference of a marked home", () => {
	it("leaves the home out of the default unlocked-asset numerator at 1 Feb", () => {
		// Before 1 Feb's flows, cash is 700 and the home is not counted. Annual expenses are the
		// next 12 months of living, 12 × 100 = 1,200. Multiple = floor(700 × 10,000 / 1,200) = 5,833.
		// Threshold 25 × 1,200 = 30,000, which 700 does not reach.
		const result = fi(homeSetup(marked))
		if (!result.ok || !result.financialIndependence.reachable) throw new Error("expected FI")
		expect(result.financialIndependence.reference).toMatchObject({
			date: "2026-02-01",
			basis: "unlockedAssets",
			unlockedAssets: 700,
			numerator: 700,
			annualExpenses: 1200,
			threshold: 30_000,
			multipleBps: 5833,
			met: false,
		})
	})

	it("keeps the home in the allAssets numerator: 700 + 6,000 = 6,700, a multiple of 55,833", () => {
		// 6,700 × 10,000 / 1,200 = 55,833.33…, floored to 55,833. The unlocked sum stays 700.
		const { baseline, scenario, timeline } = makeFixture(homeSetup(marked))
		const result = financialIndependence(baseline, scenario, timeline, {
			method: "survival",
			minBufferMonths: 1,
			reference: { basis: "allAssets" },
		})
		if (!result.ok || !result.financialIndependence.reachable) throw new Error("expected FI")
		expect(result.financialIndependence.reference).toMatchObject({
			unlockedAssets: 700,
			numerator: 6700,
			multipleBps: 55_833,
		})
	})

	it("reads the unmarked home as unlocked on 1 Jan: 300 + 6,000 = 6,300, a multiple of 52,500", () => {
		// 6,300 × 10,000 / 1,200 = 52,500 exactly.
		const result = fi(homeSetup(unmarked))
		if (!result.ok || !result.financialIndependence.reachable) throw new Error("expected FI")
		expect(result.financialIndependence.reference).toMatchObject({
			date: "2026-01-01",
			unlockedAssets: 6300,
			numerator: 6300,
			multipleBps: 52_500,
		})
	})
})
