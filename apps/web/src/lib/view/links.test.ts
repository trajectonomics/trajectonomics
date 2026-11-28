import { describe, expect, test } from "bun:test"
import { withSearch } from "./links"

describe("withSearch", () => {
	test("adds the page's query string to a path", () => {
		expect(withSearch("/net-worth/", "?demo=1")).toBe("/net-worth/?demo=1")
		expect(withSearch("/net-worth/", "")).toBe("/net-worth/")
		expect(withSearch("/tax/?year=2026", "?demo=1&year=2025")).toBe("/tax/?year=2026&demo=1")
	})

	test("leaves a fragment on the page it is in", () => {
		expect(withSearch("#check-ledger", "?demo=1")).toBe("#check-ledger")
		expect(withSearch("#check-ledger", "")).toBe("#check-ledger")
	})
})
