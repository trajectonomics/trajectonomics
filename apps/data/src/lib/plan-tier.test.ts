import { describe, expect, test } from "bun:test"
import { planTier } from "./plan-tier"

describe("planTier", () => {
	test("names the tier the plan ran on at the window's end", () => {
		expect(planTier("claude", "2026-11-27")).toEqual({
			name: "Max 5x",
			note: "Read from Claude's profile endpoint",
		})
	})

	test("has no note for a hand-kept tier that carries one", () => {
		expect(planTier("antigravity", "2026-11-27")).toEqual({ name: "Google AI Pro", note: null })
	})

	test("hides the tier before it began", () => {
		expect(planTier("claude", "2026-10-16")).toBeNull()
	})

	test("hides a plan the table knows no tier for", () => {
		expect(planTier("meta", "2026-11-27")).toBeNull()
		expect(planTier("unknown", "2026-11-27")).toBeNull()
	})
})
