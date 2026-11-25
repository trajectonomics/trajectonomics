import { describe, expect, test } from "bun:test"
import { matchPlan, plans } from "../src/plans"

describe("matchPlan", () => {
	test("matches provider ids before model prefixes", () => {
		expect(matchPlan("opencode-go", "deepseek-v4.1-flash")).toBe("opencode-go")
		expect(matchPlan("opencode", "deepseek-v4.1-flash")).toBe("opencode-free")
		expect(matchPlan("commandcode", "deepseek/deepseek-v4.1-flash")).toBe("command-code")
		expect(matchPlan("command-code", "anything")).toBe("command-code")
		expect(matchPlan("muse", "muse-ember-1.0")).toBe("meta")
		expect(matchPlan("cursor", "grok-4.7")).toBe("cursor")
		expect(matchPlan("mistral", "mistral-large-4")).toBe("mistral")
	})

	test("falls back to a model prefix when the provider is unknown", () => {
		expect(matchPlan(null, "claude-opus-5-5")).toBe("claude")
		expect(matchPlan(undefined, "gemini-4-hydrogen-high")).toBe("antigravity")
		expect(matchPlan("other", "muse-wonder-1.0")).toBe("meta")
	})

	test("returns unknown instead of inventing a plan", () => {
		expect(matchPlan("other", "other-model")).toBe("unknown")
	})

	test("plan ids are unique and prices are absent", () => {
		const ids = plans.map((plan) => plan.id)
		expect(new Set(ids).size).toBe(ids.length)
		expect(JSON.stringify(plans)).not.toContain("price")
	})
})
