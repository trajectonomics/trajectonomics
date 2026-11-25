import { describe, expect, test } from "bun:test"
import { readAsOf } from "./query"

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
