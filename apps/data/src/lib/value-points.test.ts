import { describe, expect, test } from "bun:test"
import type { CachePlanRow } from "./cache-rate"
import type { UsageRow } from "./types"
import { cachePoints, valuePoints } from "./value-points"
import type { WeeklyFigure } from "./weekly"

function figure(overrides: Partial<WeeklyFigure> = {}): WeeklyFigure {
	return {
		plan: "claude",
		planName: "Claude",
		tier: "Max",
		unit: "tokens",
		kind: "estimate",
		tokens: 1_000_000,
		low: 900_000,
		high: 1_100_000,
		rough: false,
		derived: false,
		collecting: null,
		...overrides,
	}
}

function usage(overrides: Partial<UsageRow> = {}): UsageRow {
	return {
		day: "2026-11-27",
		plan: "claude",
		model: "claude-opus-5-5",
		tokensIn: 1_000_000,
		tokensOut: 0,
		cacheRead: 0,
		cacheWrite: 0,
		tokensTotal: 1_000_000,
		requests: 1,
		granularity: "hour",
		bestEffort: false,
		...overrides,
	}
}

describe("valuePoints", () => {
	test("divides the week by the weekly price on both axes", () => {
		const points = valuePoints([figure()], [usage()])
		const weekly = (100 * 12) / 52
		expect(points[0]?.tokensPerDollar).toBeCloseTo(1_000_000 / weekly, 4)
		expect(points[0]?.apiValuePerDollar).toBeCloseTo(4 / weekly, 6)
	})

	test("marks a most-we-used week as hollow", () => {
		expect(valuePoints([figure({ kind: "fallback" })], [usage()])[0]?.hollow).toBe(true)
		expect(valuePoints([figure()], [usage()])[0]?.hollow).toBe(false)
	})

	test("leaves out a free plan", () => {
		const free = figure({ plan: "opencode-free", planName: "OpenCode (free)", tier: "Free" })
		expect(valuePoints([free], [usage({ plan: "opencode-free" })])).toEqual([])
	})

	test("leaves out a plan whose tier has no price", () => {
		const antigravity = figure({
			plan: "antigravity",
			planName: "Antigravity",
			tier: "Google AI Pro",
		})
		expect(valuePoints([antigravity], [usage({ plan: "antigravity" })])).toEqual([])
	})

	test("leaves out a plan whose models all lack a price", () => {
		expect(valuePoints([figure()], [usage({ model: "made-up-model" })])).toEqual([])
	})
})

describe("cachePoints", () => {
	test("pairs every priced plan with its cache rate and tokens per dollar", () => {
		const points = valuePoints([figure()], [usage()])
		const rows = [{ plan: "claude", rate: 0.75 }] as CachePlanRow[]
		const dots = cachePoints(points, rows)
		expect(dots).toHaveLength(1)
		expect(dots[0]?.x).toBe(75)
		expect(dots[0]?.y).toBeCloseTo(points[0]?.y ?? 0, 6)
	})

	test("leaves out a plan with no cache split", () => {
		const points = valuePoints([figure()], [usage()])
		const rows = [{ plan: "claude", rate: null }] as CachePlanRow[]
		expect(cachePoints(points, rows)).toEqual([])
	})
})
