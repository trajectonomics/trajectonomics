import { describe, expect, it } from "bun:test"
import { dictionaryFor } from "../language/languages"
import { FI_DEMO_AS_OF, FI_DEMO_COMMAND, FI_DEMO_DATE, FI_DEMO_HORIZON } from "../site"
import { CHART_END_DATE, CHART_START_DATE, KNEE_FRACTION, netWorthShape } from "./chart-layout"
import { dateFraction, shortMonthYear } from "./share-date"

/** The u values a test walks the curve at, the two ends included. */
const WALK = Object.freeze(Array.from({ length: 1001 }, (_, index) => index / 1000))

/** The day count between two UTC dates, worked out independently of the module. */
function daysBetween(
	from: readonly [number, number, number],
	to: readonly [number, number, number],
) {
	return Math.round((Date.UTC(...to) - Date.UTC(...from)) / 86_400_000)
}

describe("the net-worth line a home card draws", () => {
	it("never falls as time passes", () => {
		const heights = WALK.map(netWorthShape)
		for (let index = 1; index < heights.length; index += 1) {
			expect(heights[index] ?? 0).toBeGreaterThanOrEqual(heights[index - 1] ?? 0)
		}
	})

	it("joins the working years and the free years with no step at the FI date", () => {
		const atKnee = netWorthShape(KNEE_FRACTION)
		expect(Math.abs(netWorthShape(KNEE_FRACTION + 1e-12) - atKnee)).toBeLessThan(1e-9)
		expect(Math.abs(netWorthShape(KNEE_FRACTION - 1e-12) - atKnee)).toBeLessThan(1e-9)
	})

	it("stays inside the chart: every height is a fraction from 0 to 1", () => {
		for (const height of WALK.map(netWorthShape)) {
			expect(height).toBeGreaterThanOrEqual(0)
			expect(height).toBeLessThanOrEqual(1)
		}
	})

	it("starts low, rises through the working years and keeps rising once free", () => {
		expect(netWorthShape(0)).toBeLessThan(netWorthShape(KNEE_FRACTION))
		expect(netWorthShape(KNEE_FRACTION)).toBeLessThan(netWorthShape(1))
	})
})

describe("the date the home card writes on the curve", () => {
	it("puts the knee at the FI date's own share of the demo's time axis", () => {
		const knee = daysBetween([2026, 2, 31], [2041, 7, 1])
		const axis = daysBetween([2026, 2, 31], [2066, 2, 31])
		expect(KNEE_FRACTION).toBeCloseTo(knee / axis, 12)
		expect(KNEE_FRACTION).toBeCloseTo(0.38, 2)
	})

	it("maps the axis's two ends to zero and one", () => {
		expect(dateFraction(CHART_START_DATE, CHART_START_DATE, CHART_END_DATE)).toBe(0)
		expect(dateFraction(CHART_END_DATE, CHART_START_DATE, CHART_END_DATE)).toBe(1)
		expect(dateFraction(FI_DEMO_DATE, CHART_START_DATE, CHART_END_DATE)).toBe(KNEE_FRACTION)
	})

	it("names the month in the Language's own short names, with the Gregorian year", () => {
		expect(shortMonthYear("2041-08-01", dictionaryFor("en").shareMonths)).toBe("Aug 2041")
		expect(shortMonthYear("2041-08-01", dictionaryFor("th").shareMonths)).toBe("ส.ค. 2041")
	})

	it("writes every month from January to December with its own name", () => {
		for (const { language, dictionary } of [
			{ language: "en", dictionary: dictionaryFor("en") },
			{ language: "th", dictionary: dictionaryFor("th") },
		]) {
			expect({ language, months: dictionary.shareMonths.length }).toEqual({ language, months: 12 })
			expect({ language, unique: new Set(dictionary.shareMonths).size }).toEqual({
				language,
				unique: 12,
			})
		}
	})
})

describe("the card's time axis against the demo command", () => {
	it("spans the as-of and the horizon the demo's command runs with", () => {
		expect(FI_DEMO_COMMAND).toContain(`--as-of ${FI_DEMO_AS_OF} `)
		expect(FI_DEMO_COMMAND).toContain(`--horizon ${FI_DEMO_HORIZON} `)
	})
})
