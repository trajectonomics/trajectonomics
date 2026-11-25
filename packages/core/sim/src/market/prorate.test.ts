import { describe, expect, it } from "bun:test"
import { createStates } from "../engine/state"
import { makeFixture } from "../engine/test-helpers"
import { valuation } from "../engine/value"
import { oracleResolveRows, oracleSpanGrow } from "../golden/oracle-returns"
import type { ReturnModel } from "../types"
import { marketPaths, marketReturns } from "./paths"

/** One bucket: every month returns 3,100 bps, so a part month takes its share of the days. */
const model: ReturnModel = {
	id: "hand",
	accounts: ["fund"],
	buckets: [{ returnsBps: [3100], weight: 2 ** 32 }],
}

function fixture(start: string, horizon: string) {
	return makeFixture({
		accounts: [{ id: "fund", kind: "asset", rate: 0 }],
		balances: { fund: 100_000 },
		surplus: [{ account: "fund" }],
		start,
		horizon,
	})
}

function valueAt(start: string, horizon: string, date: string): bigint {
	const { baseline, scenario, timeline } = fixture(start, horizon)
	const [path] = marketPaths(model, 1n, 1, timeline)
	return valuation(createStates(baseline, scenario, start, path).get("fund")!, date)
}

describe("a Market row cut by the Timeline", () => {
	it("states each row over its whole month", () => {
		const { timeline } = fixture("2027-01-16", "2027-02-16")
		const [path] = marketReturns(model, 1n, 1, timeline)
		expect(path?.series[0]?.rows).toEqual([
			{ from: "2027-01-16", returnBps: 3100, span: 31 },
			{ from: "2027-02-01", returnBps: 3100, span: 28 },
		])
	})

	it("gives a Timeline that starts on the 16th 16 of January's 31 days of its return", () => {
		// 100,000 × (1 + 3,100 bps × 16 / 31) = 116,000
		expect(valueAt("2027-01-16", "2027-03-01", "2027-02-01")).toBe(116_000n)
	})

	it("gives a horizon on the 15th 14 of February's 28 days of its return", () => {
		// 100,000 × (1 + 3,100 × 31 / 31) = 131,000, then × (1 + 3,100 bps × 14 / 28) = 151,305
		expect(valueAt("2027-01-01", "2027-02-15", "2027-02-15")).toBe(151_305n)
	})

	it("matches the oracle's day-by-day walk over whole months", () => {
		const rows = oracleResolveRows(
			[
				{ from: "2027-01-01", returnBps: 3100, span: 31 },
				{ from: "2027-02-01", returnBps: 3100, span: 28 },
			],
			"2027-02-15",
		)
		expect(oracleSpanGrow(100_000n, "2027-01-01", "2027-02-15", rows)).toBe(151_305n)
	})
})
