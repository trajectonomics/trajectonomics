import { describe, expect, test } from "bun:test"
import { planModels } from "./plan-models"
import type { UsageRow } from "./types"

function row(overrides: Partial<UsageRow> = {}): UsageRow {
	return {
		day: "2026-11-24",
		plan: "claude",
		model: "claude-opus-5-5",
		tokensIn: 10,
		tokensOut: 20,
		cacheRead: 30,
		cacheWrite: 40,
		tokensTotal: 100,
		requests: 1,
		granularity: "hour",
		bestEffort: false,
		...overrides,
	}
}

describe("a plan's models", () => {
	test("sums a model over its rows and ranks by tokens without cache reads", () => {
		const models = planModels(
			[
				row({ model: "claude-opus-5-5", tokensTotal: 100, cacheRead: 90 }),
				row({ day: "2026-11-25", model: "claude-opus-5-5", tokensTotal: 100, cacheRead: 90 }),
				row({ model: "claude-haiku-5-5", tokensTotal: 80, cacheRead: 0 }),
			],
			"claude",
		)
		expect(models.map((entry) => entry.model)).toEqual(["claude-haiku-5-5", "claude-opus-5-5"])
		expect(models[1]).toEqual({
			model: "claude-opus-5-5",
			tokens: 20,
			cacheRead: 180,
			cacheReadShare: 0.9,
		})
	})

	test("keeps another plan's models out", () => {
		const models = planModels(
			[row({ plan: "claude" }), row({ plan: "cursor", model: "composer-2" })],
			"cursor",
		)
		expect(models.map((entry) => entry.model)).toEqual(["composer-2"])
	})

	test("reports no cache share when the rows have no cache reads", () => {
		const [model] = planModels([row({ cacheRead: null, tokensTotal: 70 })], "claude")
		expect(model).toEqual({
			model: "claude-opus-5-5",
			tokens: 70,
			cacheRead: null,
			cacheReadShare: null,
		})
	})

	test("answers an empty list for a plan with no rows", () => {
		expect(planModels([row()], "mistral")).toEqual([])
	})
})
