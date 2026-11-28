import { describe, expect, test } from "bun:test"
import {
	DEFAULT_PERIOD,
	isBucketKind,
	isPeriodKey,
	PERIODS,
	periodWindow,
	resolveBucket,
} from "./period"

describe("the period windows", () => {
	test("open on the default period", () => {
		expect(DEFAULT_PERIOD).toBe("30d")
		expect(PERIODS.map((period) => period.key)).toEqual([
			"1d",
			"3d",
			"7d",
			"wtd",
			"mtd",
			"30d",
			"90d",
		])
	})

	test("count whole days back from the day in view", () => {
		expect(periodWindow("1d", "2026-11-25").days).toEqual(["2026-11-25"])
		expect(periodWindow("3d", "2026-11-25").days).toEqual([
			"2026-11-23",
			"2026-11-24",
			"2026-11-25",
		])
		expect(periodWindow("7d", "2026-11-25").from).toBe("2026-11-19")
		expect(periodWindow("7d", "2026-11-25").days).toHaveLength(7)
		expect(periodWindow("30d", "2026-11-25").from).toBe("2026-10-27")
		expect(periodWindow("90d", "2026-11-25").from).toBe("2026-08-28")
	})

	test("starts this week on Monday", () => {
		const wednesday = periodWindow("wtd", "2026-11-25")
		expect(wednesday.from).toBe("2026-11-23")
		expect(wednesday.days).toEqual(["2026-11-23", "2026-11-24", "2026-11-25"])
		const monday = periodWindow("wtd", "2026-11-23")
		expect(monday.days).toEqual(["2026-11-23"])
		const sunday = periodWindow("wtd", "2026-11-29")
		expect(sunday.from).toBe("2026-11-23")
		expect(sunday.days).toHaveLength(7)
	})

	test("starts this month on the first", () => {
		const window = periodWindow("mtd", "2026-11-25")
		expect(window.from).toBe("2026-11-01")
		expect(window.days).toHaveLength(25)
		expect(periodWindow("mtd", "2026-11-01").days).toEqual(["2026-11-01"])
	})

	test("rejects a day that is not a UTC day", () => {
		expect(() => periodWindow("1d", "2026-02-30")).toThrow()
	})
})

describe("the bucket resolution", () => {
	test("keeps a bucket the period can fill", () => {
		expect(resolveBucket("3d", "day")).toBe("day")
		expect(resolveBucket("7d", "hour")).toBe("hour")
		expect(resolveBucket("30d", "week")).toBe("week")
	})

	test("falls back to the period's default", () => {
		expect(resolveBucket("1d", "day")).toBe("hour")
		expect(resolveBucket("30d", "hour")).toBe("day")
		expect(resolveBucket("90d", null)).toBe("week")
		expect(resolveBucket("wtd", null)).toBe("day")
	})
})

describe("the period table", () => {
	test("names every period and bucket the query accepts", () => {
		expect(isPeriodKey("wtd")).toBe(true)
		expect(isPeriodKey("1y")).toBe(false)
		expect(isBucketKind("week")).toBe(true)
		expect(isBucketKind("month")).toBe(false)
	})
})
