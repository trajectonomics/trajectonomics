import { describe, expect, test } from "bun:test"
import { actionSource, isActionSource } from "./action-source"

describe("an inline action's source", () => {
	test("is built from the words that tell one control from another", () => {
		expect(actionSource("main", "base")).toBe("action:main:base")
		expect(isActionSource(actionSource("allowances", "th-pit:2026-01-01"))).toBe(true)
	})

	test("is never a form's source", () => {
		for (const form of ["form", "routing", "household", "tax-label", "remove-tax", "assumptions"])
			expect(isActionSource(form)).toBe(false)
	})
})
