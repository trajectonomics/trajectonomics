import { describe, expect, test } from "bun:test"
import { projectionRun } from "../compare/projection.test-support"
import { taxBody } from "./body"
import { bracketBars, topIndex } from "./bracket-bars"
import { bracketChart } from "./bracket-chart"
import { plainYear, schedule, walkedYear } from "./brackets.test-support"
import { currentYear, pickCurrent } from "./current-year"
import { rateRows } from "./rate-rows"
import { rateWords } from "./rate-words"

const NEXT = { from: "2027-01-01", to: "2027-12-31", settlementDate: "2028-03-31" }

describe("the current tax year", () => {
	test("is the year the As-of falls in, not the first one", () => {
		const years = [walkedYear(), walkedYear(NEXT)]
		expect(pickCurrent(years, "2026-10-31")?.from).toBe("2026-01-01")
		expect(pickCurrent(years, "2027-03-01")?.from).toBe("2027-01-01")
		expect(currentYear(years, "2027-12-31")?.period).toBe("1 Jan 2027 to 31 Dec 2027")
	})

	test("is the first year after the As-of when none holds it, and none when all are past", () => {
		const years = [walkedYear(NEXT)]
		expect(pickCurrent(years, "2026-10-31")?.from).toBe("2027-01-01")
		expect(pickCurrent(years, "2028-02-01")).toBeNull()
	})

	test("states the walk in the CLI's figures, in order, with the two taken-off lines marked", () => {
		const year = currentYear([walkedYear()], "2026-10-31")
		expect(year?.walk?.map((line) => [line.label, line.amount, line.less])).toEqual([
			["Assessable income", "560000.00", false],
			["Expenses", "100000.00", true],
			["Allowances", "60000.00", true],
			["Taxable income", "400000.00", false],
		])
	})

	test("says the rates in words and keeps the room to the next bracket", () => {
		const year = currentYear([walkedYear()], "2026-10-31")
		expect([year?.topRate, year?.shareOfIncome, year?.toNextBracket]).toEqual([
			"10%",
			"3.12%",
			"100000.00",
		])
	})

	test("shows the CLI's notes, such as the minimum tax", () => {
		const note = "The minimum tax applied: 6000.00 (Section 48(2))."
		expect(currentYear([walkedYear({ notes: [note] })], "2026-10-31")?.notes).toEqual([note])
	})

	test("is absent for a hand-written Levy, which states none of it", () => {
		expect(currentYear([plainYear()], "2026-10-31")).toBeNull()
	})
})

describe("the bracket bars", () => {
	test("hold the brackets the income reached, and mark the last as the top rate", () => {
		const bars = bracketBars(walkedYear().brackets ?? [])
		expect(bars.map((bar) => [bar.rate, bar.income, bar.tax, bar.top])).toEqual([
			["0%", "150000.00", "0.00", false],
			["5%", "150000.00", "7500.00", false],
			["10%", "100000.00", "10000.00", true],
		])
		expect(bars.map((bar) => bar.width)).toEqual([100, 100, (100000 / 150000) * 100])
	})

	test("end in the highest bracket when the income is there, with no room stated", () => {
		const slices: (readonly [string, string])[] = [
			["150000.00", "0.00"],
			["150000.00", "7500.00"],
			["200000.00", "20000.00"],
			["250000.00", "37500.00"],
			["250000.00", "50000.00"],
			["1000000.00", "250000.00"],
			["3000000.00", "900000.00"],
			["1000000.00", "350000.00"],
		]
		const year = walkedYear({ brackets: schedule(slices), marginalRateBps: 3500 })
		const { toNextBracket: _room, ...top } = year
		const view = currentYear([top], "2026-10-31")
		expect(view?.bars?.length).toBe(8)
		expect(view?.bars?.at(-1)?.top).toBe(true)
		expect(view?.toNextBracket).toBeNull()
	})

	test("an income exactly on an edge ends in the bracket the edge closes", () => {
		const edge = schedule([
			["150000.00", "0.00"],
			["150000.00", "7500.00"],
			["200000.00", "20000.00"],
			["250000.00", "37500.00"],
			["250000.00", "50000.00"],
		])
		expect(bracketBars(edge).at(-1)?.rate).toBe("20%")
		expect(topIndex(edge)).toBe(4)
	})

	test("no income marks the first bracket", () => {
		const bars = bracketBars(schedule([]))
		expect(bars.map((bar) => [bar.rate, bar.top, bar.width])).toEqual([["0%", true, 0]])
	})
})

describe("the bracket chart", () => {
	test("stacks a series per rate, lowest first, with nominal figures as the CLI wrote them", () => {
		const chart = bracketChart([walkedYear(), walkedYear(NEXT)])
		expect(chart?.series.map((line) => line.name).slice(0, 3)).toEqual([
			"Taxed at 0%",
			"Taxed at 5%",
			"Taxed at 10%",
		])
		expect(chart?.series[2]?.points.map((point) => point.display)).toEqual([
			"100,000.00",
			"100,000.00",
		])
		expect(chart?.series[3]?.points[0]?.display).toBe("0.00")
	})

	test("draws the top rate of each year as a step line on a second axis", () => {
		const chart = bracketChart([walkedYear(), walkedYear({ ...NEXT, marginalRateBps: 1500 })])
		expect(chart?.step?.line.points.map((point) => [point.y, point.display])).toEqual([
			[1000, "10%"],
			[1500, "15%"],
		])
		expect(chart?.step?.label(2500)).toBe("25%")
	})

	test("is absent when no year states brackets", () => {
		expect(bracketChart([plainYear()])).toBeNull()
	})
})

describe("the table of rates", () => {
	test("has a row per year with the CLI's figures and rates", () => {
		const rows = rateRows([walkedYear(), walkedYear(NEXT)])
		expect(rows[0]).toMatchObject({
			assessable: "560000.00",
			taxable: "400000.00",
			tax: "17500.00",
			topRate: "10%",
			shareOfIncome: "3.12%",
		})
		expect(rows).toHaveLength(2)
	})

	test("says a figure the CLI did not state is not stated, and is empty for a hand-written Levy", () => {
		const rows = rateRows([walkedYear(), plainYear(NEXT)])
		expect(rows[1]).toMatchObject({ assessable: null, topRate: null, shareOfIncome: null })
		expect(rateRows([plainYear()])).toEqual([])
	})

	test("words a rate as a percent without trailing zeros", () => {
		expect([rateWords(0), rateWords(1250), rateWords(3500)]).toEqual(["0%", "12.5%", "35%"])
	})
})

describe("the body", () => {
	test("carries the current year, the chart and the rows, and none of them for a hand-written Levy", () => {
		const walked = taxBody(projectionRun({ taxYears: [walkedYear()] }))
		const plain = taxBody(projectionRun({ taxYears: [plainYear()] }))
		expect(walked.kind === "levies" && walked.current !== null && walked.brackets !== null).toBe(
			true,
		)
		expect(plain).toMatchObject({ kind: "levies", current: null, brackets: null, rates: [] })
	})
})
