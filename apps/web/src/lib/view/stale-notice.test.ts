import { describe, expect, test } from "bun:test"
import { noticeCase } from "./stale-notice"

describe("what a stale notice says", () => {
	test("both cases in a drawer, a refusal over a plan that moved on beating a landed write", () => {
		expect(noticeCase("both", true, true)).toBe("stale")
		expect(noticeCase("both", true, false)).toBe("stale")
		expect(noticeCase("both", false, true)).toBe("landed")
		expect(noticeCase("both", false, false)).toBeNull()
	})

	test("only the plan that moved on beside an inline form", () => {
		expect(noticeCase("stale", true, true)).toBe("stale")
		expect(noticeCase("stale", false, true)).toBeNull()
	})

	test("only the write that landed unread above the page", () => {
		expect(noticeCase("landed", true, false)).toBeNull()
		expect(noticeCase("landed", false, true)).toBe("landed")
		expect(noticeCase("landed", true, true)).toBe("landed")
	})
})
