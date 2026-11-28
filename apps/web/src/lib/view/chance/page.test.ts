import { describe, expect, test } from "bun:test"
import { chanceFixture } from "./fixtures.test-support"
import { chanceSummaryOf, chanceViewOf, fanSeriesOf, runsOutBarsOf } from "./page"

describe("chanceSummaryOf", () => {
	test("states the share from the CLI's basis points, with the markets and the currency", () => {
		expect(chanceSummaryOf(chanceFixture())).toEqual({
			share: "87%",
			succeeded: 174,
			paths: 200,
			lasts: "Lasts to 2028 in 174 of 200 markets.",
			currency: "THB",
			notes: ["Every figure is nominal."],
		})
	})
})

describe("fanSeriesOf", () => {
	test("draws one series per Percentile, with a point at each roll-up in the CLI's order", () => {
		const series = fanSeriesOf(chanceFixture().bands)
		expect(series.map((line) => line.name)).toEqual(["P10", "P25", "P50", "P75", "P90"])
		const p50 = series.find((line) => line.name === "P50")
		expect(p50?.points).toEqual([
			{ x: 0, xLabel: "2026", y: 50000, display: "50,000.00" },
			{ x: 1, xLabel: "2027", y: 50100, display: "50,100.00" },
			{ x: 2, xLabel: "2028", y: 50200, display: "50,200.00" },
		])
	})

	test("places a negative net worth as a negative number, shown with the true minus sign", () => {
		const bands = chanceFixture().bands.map((band) => ({
			...band,
			netWorth: band.netWorth.map((percentile) => ({ ...percentile, value: "-1200.50" })),
		}))
		const p10 = fanSeriesOf(bands).find((line) => line.name === "P10")
		expect(p10?.points[0]).toMatchObject({ y: -1200.5, display: "−1,200.50" })
	})
})

describe("runsOutBarsOf", () => {
	test("labels every fifth roll-up with its year and leaves the rest unlabelled", () => {
		const rows = [0, 1, 2, 3, 4, 5].map((index) => ({
			index,
			to: `${2026 + index}-12-31`,
			paths: index,
		}))
		expect(runsOutBarsOf(rows).map((bar) => bar.label)).toEqual([
			"2026",
			null,
			null,
			null,
			null,
			"2031",
		])
	})

	test("labels every tenth roll-up once the row passes 50 bars, so a year never meets the next one", () => {
		const labelled = (count: number) =>
			runsOutBarsOf(
				Array.from({ length: count }, (_, index) => ({
					index,
					to: `${2026 + index}-12-31`,
					paths: 0,
				})),
			).flatMap((bar, index) => (bar.label === null ? [] : [index]))
		expect(labelled(50)).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45])
		expect(labelled(60)).toEqual([0, 10, 20, 30, 40, 50])
		expect(labelled(100)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90])
	})

	test("titles each bar with its count, in the singular for one path", () => {
		expect(runsOutBarsOf([{ index: 1, to: "2027-12-31", paths: 1 }])[0]?.title).toBe(
			"1 failing path runs out in 2027",
		)
		expect(runsOutBarsOf([{ index: 1, to: "2027-12-31", paths: 3 }])[0]?.title).toBe(
			"3 failing paths run out in 2027",
		)
	})
})

describe("chanceViewOf", () => {
	test("carries the CLI's definition and notes beside the share and the bars", () => {
		const view = chanceViewOf(chanceFixture())
		expect(view.share).toBe("87%")
		expect(view.definition).toEqual({
			modelId: "illustrative-demo-model",
			seed: "0123456789abcdef",
			paths: 200,
			modelHash: "jcs1:sha256:0000000000000000000000000000000000000000000000000000000000000000",
		})
		expect(view.notes).toEqual(["Every figure is nominal."])
		expect(view.runsOut.map((bar) => bar.paths)).toEqual([0, 12, 14])
	})
})

describe("bandRowsOf", () => {
	test("takes the CLI's Bands table rows as dates and money, and reads nothing else", () => {
		const view = chanceViewOf(
			chanceFixture({
				tables: [
					{
						name: "bands",
						count: 1,
						rows: [{ index: 2, to: "2028-12-31", p10: "1000.00", p50: "2000.50", p90: "3000.00" }],
					},
				],
			}),
		)
		expect(view.bandRows).toEqual([
			{ ends: "31 Dec 2028", p10: "1,000.00", p50: "2,000.50", p90: "3,000.00" },
		])
	})

	test("has no rows when the CLI printed no Bands table", () => {
		expect(chanceViewOf(chanceFixture()).bandRows).toEqual([])
	})
})
