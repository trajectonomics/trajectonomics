import { describe, expect, test } from "bun:test"
import { logViewSearch, readAsOf, readLogView } from "./query"

describe("the asOf query parameter", () => {
	test("is the day the address names", () => {
		expect(readAsOf("?asOf=2026-11-24")).toBe("2026-11-24")
	})

	test("is null on the live view", () => {
		expect(readAsOf("")).toBeNull()
	})

	test("is ignored when it is not a real UTC day", () => {
		expect(readAsOf("?asOf=2026-02-30")).toBeNull()
		expect(readAsOf("?asOf=yesterday")).toBeNull()
	})
})

describe("the log view parameters", () => {
	test("open on 30 days by day", () => {
		expect(readLogView("")).toEqual({ period: "30d", bucket: "day" })
	})

	test("read a period and a bucket it allows", () => {
		expect(readLogView("?period=3d&by=day")).toEqual({ period: "3d", bucket: "day" })
		expect(readLogView("?period=7d&by=hour")).toEqual({ period: "7d", bucket: "hour" })
		expect(readLogView("?period=wtd")).toEqual({ period: "wtd", bucket: "day" })
	})

	test("fall back from junk, and resolve a bucket the period cannot fill", () => {
		expect(readLogView("?period=nope")).toEqual({ period: "30d", bucket: "day" })
		expect(readLogView("?period=1d&by=week")).toEqual({ period: "1d", bucket: "hour" })
		expect(readLogView("?period=30d&by=hour")).toEqual({ period: "30d", bucket: "day" })
		expect(readLogView("?period=nope&by=hour")).toEqual({ period: "30d", bucket: "day" })
	})
})

describe("the log view address", () => {
	test("drops the defaults and keeps asOf", () => {
		expect(logViewSearch({ period: "30d", bucket: "day" }, null)).toBe("")
		expect(logViewSearch({ period: "30d", bucket: "day" }, "2026-11-24")).toBe("?asOf=2026-11-24")
	})

	test("names a period that is not the default", () => {
		expect(logViewSearch({ period: "1d", bucket: "hour" }, null)).toBe("?period=1d")
		expect(logViewSearch({ period: "90d", bucket: "week" }, null)).toBe("?period=90d")
	})

	test("names a bucket that is not the period's default", () => {
		expect(logViewSearch({ period: "3d", bucket: "day" }, null)).toBe("?period=3d&by=day")
		expect(logViewSearch({ period: "wtd", bucket: "hour" }, "2026-11-24")).toBe(
			"?asOf=2026-11-24&period=wtd&by=hour",
		)
	})
})
