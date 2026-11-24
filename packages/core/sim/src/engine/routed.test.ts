import { describe, expect, it } from "bun:test"
import { routedTargetAt } from "./routed"

const START = "2026-01-01"

describe("a routing target in force on a date (ADR 0030)", () => {
	it("a floor of 300,000 at 3% inflation is 337,653 in the fifth year and 347,782 from the fifth anniversary", () => {
		const floor = { amount: 300_000, growth: "inflation" } as const
		expect(routedTargetAt(floor, START, "2030-12-31", 300)).toBe(337_653)
		expect(routedTargetAt(floor, START, "2031-01-01", 300)).toBe(347_782)
	})

	it("an upTo of 1,000,000 is 1,159,274 from the fifth anniversary", () => {
		const target = { amount: 1_000_000, growth: "inflation" } as const
		expect(routedTargetAt(target, START, "2031-01-01", 300)).toBe(1_159_274)
	})

	it("a nominal target is itself on every date", () => {
		expect(routedTargetAt(300_000, START, START, 300)).toBe(300_000)
		expect(routedTargetAt(300_000, START, "2040-06-30", 300)).toBe(300_000)
	})

	it("is the amount itself on the Timeline start and before any anniversary", () => {
		const target = { amount: 300_000, growth: "inflation" } as const
		expect(routedTargetAt(target, START, START, 300)).toBe(300_000)
		expect(routedTargetAt(target, START, "2026-12-31", 300)).toBe(300_000)
	})

	it("with `{ bps: 0 }` stays fixed, whatever the inflation", () => {
		const target = { amount: 300_000, growth: { bps: 0 } } as const
		expect(routedTargetAt(target, START, "2036-01-01", 300)).toBe(300_000)
	})

	it("with a negative `bps` steps down: 300,000 at -100 bps is 297,000, then 294,030", () => {
		const target = { amount: 300_000, growth: { bps: -100 } } as const
		expect(routedTargetAt(target, START, "2027-01-01", 300)).toBe(297_000)
		expect(routedTargetAt(target, START, "2028-01-01", 300)).toBe(294_030)
	})

	it("with `growth: inflation` follows a negative inflation down too", () => {
		const target = { amount: 300_000, growth: "inflation" } as const
		expect(routedTargetAt(target, START, "2027-01-01", -100)).toBe(297_000)
	})

	it("steps on the anniversary itself, not the day before", () => {
		const target = { amount: 100_000, growth: { bps: 1000 } } as const
		expect(routedTargetAt(target, START, "2026-12-31", 0)).toBe(100_000)
		expect(routedTargetAt(target, START, "2027-01-01", 0)).toBe(110_000)
	})

	it("from a Timeline starting on 29 February steps on 28 February of a common year", () => {
		const target = { amount: 300_000, growth: "inflation" } as const
		expect(routedTargetAt(target, "2028-02-29", "2029-02-27", 300)).toBe(300_000)
		expect(routedTargetAt(target, "2028-02-29", "2029-02-28", 300)).toBe(309_000)
		expect(routedTargetAt(target, "2028-02-29", "2032-02-28", 300)).toBe(327_818)
		expect(routedTargetAt(target, "2028-02-29", "2032-02-29", 300)).toBe(337_653)
		expect(routedTargetAt(target, "2028-02-29", "2033-02-28", 300)).toBe(347_782)
	})

	it("throws a RangeError for a value beyond 2^53 rather than rounding it", () => {
		const target = { amount: 9_000_000_000_000_000, growth: "inflation" } as const
		expect(routedTargetAt(target, START, "2026-12-31", 300)).toBe(9_000_000_000_000_000)
		expect(() => routedTargetAt(target, START, "2027-01-01", 300)).toThrow(RangeError)
	})
})
