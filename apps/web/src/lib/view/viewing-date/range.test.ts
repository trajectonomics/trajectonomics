import { describe, expect, test } from "bun:test"
import { DEMO } from "../what-if/fixtures.test-support"
import { atParam, monthAt, monthCount, monthIndex, viewingMonth, viewingRange } from "./range"

const RANGE = viewingRange(DEMO.params)

describe("the range of months a Snapshot allows", () => {
	test("on the Demo's parameters it runs from the first history month to the horizon month", () => {
		expect(RANGE).toEqual({ first: "2024-11", asOf: "2026-10", last: "2053-12" })
	})

	test("with no history the range starts at the As-of month", () => {
		expect(viewingRange({ ...DEMO.params, historyDates: [] }).first).toBe("2026-10")
	})

	test("with no plans it ends at the As-of month", () => {
		expect(viewingRange({ ...DEMO.params, scenarios: [] }).last).toBe("2026-10")
	})
})

describe("the month the address asks for", () => {
	test("is clamped to the range's ends when read, never rewritten", () => {
		expect(viewingMonth("2099-01", RANGE)).toBe("2053-12")
		expect(viewingMonth("2020-01", RANGE)).toBe("2024-11")
	})

	test("an invalid month is the As-of month: empty, a word, and a month past 12", () => {
		for (const raw of ["", "life", "2026-13"]) {
			expect(viewingMonth(raw, RANGE)).toBe("2026-10")
		}
	})

	test("a month inside the range reads as it is", () => {
		expect(viewingMonth("2031-03", RANGE)).toBe("2031-03")
	})

	test("the As-of month is left out of the address, and any other month is kept", () => {
		expect(atParam("2026-10", RANGE)).toBe("")
		expect(atParam("2031-03", RANGE)).toBe("2031-03")
	})
})

describe("an index into the range", () => {
	test("counts the first month as 0 and the last as the count less one", () => {
		expect(monthIndex("2024-11", RANGE)).toBe(0)
		expect(monthCount(RANGE)).toBe(350)
		expect(monthIndex("2053-12", RANGE)).toBe(monthCount(RANGE) - 1)
	})

	test("reads back as its month, both ends and the middle included", () => {
		expect(monthAt(0, RANGE)).toBe("2024-11")
		expect(monthAt(monthCount(RANGE) - 1, RANGE)).toBe("2053-12")
		expect(monthAt(monthIndex("2031-03", RANGE), RANGE)).toBe("2031-03")
	})
})
