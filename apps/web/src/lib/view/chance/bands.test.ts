import { describe, expect, test } from "bun:test"
import { bandRowsOf, bandsIn, realBandRowsOf } from "./bands"
import { chanceFixture } from "./fixtures.test-support"

const TABLES = [
	{
		name: "bands" as const,
		count: 2,
		rows: [
			{ index: 0, to: "2026-12-31", p10: "1000.00", p50: "2000.00", p90: "3000.00" },
			{ index: 2, to: "2028-12-31", p10: "1100.00", p50: "2100.00", p90: "3100.00" },
		],
	},
]

/** The nominal Bands with every Percentile moved to a figure no nominal Band states. */
function realBands() {
	return chanceFixture().bands.map((band) => ({
		...band,
		netWorth: band.netWorth.map((percentile) => ({ ...percentile, value: "77777.00" })),
	}))
}

describe("bandRowsOf", () => {
	test("takes the CLI's Bands table rows as dates and money, and reads nothing else", () => {
		expect(bandRowsOf(TABLES)).toEqual([
			{ ends: "31 Dec 2026", p10: "1,000.00", p50: "2,000.00", p90: "3,000.00" },
			{ ends: "31 Dec 2028", p10: "1,100.00", p50: "2,100.00", p90: "3,100.00" },
		])
	})

	test("has no rows when the CLI printed no Bands table", () => {
		expect(bandRowsOf([])).toEqual([])
	})
})

describe("realBandRowsOf", () => {
	test("takes each printed roll-up's Percentiles from the real Bands at the same index", () => {
		expect(realBandRowsOf(TABLES, realBands())).toEqual([
			{ ends: "31 Dec 2026", p10: "77,777.00", p50: "77,777.00", p90: "77,777.00" },
			{ ends: "31 Dec 2028", p10: "77,777.00", p50: "77,777.00", p90: "77,777.00" },
		])
	})

	test("leaves a roll-up out rather than state a nominal figure beside real ones", () => {
		const bands = realBands().filter((band) => band.index !== 2)
		const rows = realBandRowsOf(TABLES, bands)
		expect(rows.map((row) => row.ends)).toEqual(["31 Dec 2026"])
	})
})

describe("bandsIn", () => {
	test("picks today's series for Today's money, and the nominal series for Future money", () => {
		const bands = {
			today: { series: [{ name: "P50", points: [] }], bandRows: [] },
			future: { series: [], bandRows: [] },
		}
		expect(bandsIn(bands, "today").series.map((line) => line.name)).toEqual(["P50"])
		expect(bandsIn(bands, "future").series).toEqual([])
	})

	test("falls back to the nominal series when the read states no today's money", () => {
		const future = { series: [{ name: "P90", points: [] }], bandRows: [] }
		expect(bandsIn({ today: null, future }, "today")).toBe(future)
	})
})
