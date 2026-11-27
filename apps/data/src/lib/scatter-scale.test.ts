import { describe, expect, test } from "bun:test"
import { axisFor, axisShare, niceStep } from "./scatter-scale"

describe("niceStep", () => {
	test("picks a step from the 1, 2, 2.5, 5, 10 series", () => {
		expect(niceStep(0.8)).toBe(1)
		expect(niceStep(1.6)).toBe(2)
		expect(niceStep(2.4)).toBe(2.5)
		expect(niceStep(4)).toBe(5)
		expect(niceStep(9)).toBe(10)
	})

	test("scales with the magnitude", () => {
		expect(niceStep(25)).toBe(25)
		expect(niceStep(420)).toBe(500)
	})
})

describe("axisFor", () => {
	test("draws an even axis with round ticks", () => {
		const axis = axisFor([30, 97])
		expect(axis?.kind).toBe("linear")
		expect(axis?.ticks.map((tick) => tick.value)).toEqual([0, 25, 50, 75, 100])
	})

	test("switches to a log scale when the values span more than ten times", () => {
		const axis = axisFor([2, 400])
		expect(axis?.kind).toBe("log")
		expect(axis?.ticks.map((tick) => tick.value)).toEqual([1, 10, 100, 1000])
	})

	test("keeps an even scale when the span is ten times or less", () => {
		expect(axisFor([40, 100])?.kind).toBe("linear")
	})

	test("keeps a fixed domain fixed", () => {
		const axis = axisFor([24, 80], [0, 100])
		expect(axis?.min).toBe(0)
		expect(axis?.max).toBe(100)
	})

	test("has no axis without values or with an empty fixed domain", () => {
		expect(axisFor([])).toBeNull()
		expect(axisFor([1], [5, 5])).toBeNull()
	})
})

describe("axisShare", () => {
	test("puts the ends at zero and one", () => {
		const axis = axisFor([0, 100])
		if (axis === null) throw new Error("no axis")
		expect(axisShare(axis, 0)).toBe(0)
		expect(axisShare(axis, 100)).toBe(1)
	})

	test("splits a log axis by orders of magnitude", () => {
		const axis = axisFor([1, 1000])
		if (axis === null) throw new Error("no axis")
		expect(axisShare(axis, 10)).toBeCloseTo(1 / 3, 6)
		expect(axisShare(axis, 100)).toBeCloseTo(2 / 3, 6)
	})

	test("keeps a value inside the axis", () => {
		const axis = axisFor([0, 100])
		if (axis === null) throw new Error("no axis")
		expect(axisShare(axis, -10)).toBe(0)
		expect(axisShare(axis, 140)).toBe(1)
	})
})
