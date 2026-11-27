import { describe, expect, test } from "bun:test"
import type { UsageRow } from "@trajectonomics/data-collector/types"
import { usageRow } from "./support/fixtures"
import { harness } from "./support/http"
import { read, seed } from "./support/usage"

type Peak = { tokens: number; fromDay: string; cacheRead: number }

type Limits = { fiveHours: null; sevenDays: null; thirtyDays: null }

type PeaksBody = {
	plans: {
		plan: string
		tier: string | null
		fiveHours: Peak | null
		sevenDays: Peak | null
		thirtyDays: Peak | null
		limits: Limits
		measured: {
			tier: string | null
			fiveHours: Peak | null
			sevenDays: Peak | null
			thirtyDays: Peak | null
			limits: Limits | null
		}[]
	}[]
}

/** A row whose total is the only token figure, so a synthetic sum is not checked against parts. */
function withTotal(total: number, overrides: Partial<UsageRow> = {}): UsageRow {
	return usageRow({
		tokensIn: null,
		tokensOut: null,
		cacheRead: null,
		cacheWrite: null,
		tokensTotal: total,
		...overrides,
	})
}

describe("GET /api/peaks by tier", () => {
	test("splits a plan's measured figures at a tier change and keeps the current tier's", async () => {
		const context = harness()
		await seed(context, [
			withTotal(100, { hourUtc: "2026-10-16T10:00:00.000Z" }),
			withTotal(200, { hourUtc: "2026-10-17T10:00:00.000Z" }),
		])
		const body = (await (await read(context, "/api/peaks")).json()) as PeaksBody
		expect(body.plans[0]).toEqual({
			plan: "claude",
			tier: "Max",
			fiveHours: { tokens: 200, fromDay: "2026-10-17", cacheRead: 0 },
			sevenDays: { tokens: 200, fromDay: "2026-10-17", cacheRead: 0 },
			thirtyDays: { tokens: 200, fromDay: "2026-10-17", cacheRead: 0 },
			limits: { fiveHours: null, sevenDays: null, thirtyDays: null },
			measured: [
				{
					tier: "Max",
					fiveHours: { tokens: 200, fromDay: "2026-10-17", cacheRead: 0 },
					sevenDays: { tokens: 200, fromDay: "2026-10-17", cacheRead: 0 },
					thirtyDays: { tokens: 200, fromDay: "2026-10-17", cacheRead: 0 },
					limits: { fiveHours: null, sevenDays: null, thirtyDays: null },
				},
				{
					tier: "Pro",
					fiveHours: { tokens: 100, fromDay: "2026-10-16", cacheRead: 0 },
					sevenDays: { tokens: 100, fromDay: "2026-10-16", cacheRead: 0 },
					thirtyDays: { tokens: 100, fromDay: "2026-10-16", cacheRead: 0 },
					limits: null,
				},
			],
		})
	})
})

describe("GET /api/peaks and cache reads", () => {
	test("leaves cache reads out of the figure and reports them apart", async () => {
		const context = harness()
		await seed(context, [withTotal(1_000, { hourUtc: "2026-11-24T10:00:00.000Z", cacheRead: 990 })])
		const body = (await (await read(context, "/api/peaks")).json()) as PeaksBody
		expect(body.plans[0]?.fiveHours).toEqual({
			tokens: 10,
			fromDay: "2026-11-24",
			cacheRead: 990,
		})
		expect(body.plans[0]?.measured[0]?.fiveHours?.cacheRead).toBe(990)
	})
})
