import { describe, expect, test } from "bun:test"
import { quotaSample, usageRow, withTotal } from "./support/fixtures"
import { harness } from "./support/http"
import { type PeaksBody, texts } from "./support/peaks"
import { read, seed } from "./support/usage"

describe("GET /api/peaks limits", () => {
	test("estimates each window's 100% from the meter and leaks no reading", async () => {
		const context = harness()
		await seed(
			context,
			[
				withTotal(1_000_000, { hourUtc: "2026-11-24T10:00:00.000Z" }),
				withTotal(1_064_731, { hourUtc: "2026-11-24T11:00:00.000Z" }),
			],
			[
				quotaSample({
					sampledAt: "2026-11-24T10:00:00.000Z",
					usedPct: 32,
					resetsAt: "2026-11-24T15:00:12.000Z",
				}),
				quotaSample({
					sampledAt: "2026-11-24T12:00:00.000Z",
					usedPct: 47,
					resetsAt: "2026-11-24T15:00:48.000Z",
				}),
			],
		)
		const body = (await (await read(context, "/api/peaks")).json()) as PeaksBody
		const limits = {
			fiveHours: {
				tokens: 13_764_873,
				low: 12_904_569,
				high: 14_748_079,
				processed: {
					value: 13_764_873,
					low: 12_904_569,
					high: 14_748_079,
				},
				usd: null,
				points: 15,
				readings: 2,
				rough: true,
			},
			sevenDays: null,
			thirtyDays: null,
		}
		expect(body.plans[0]?.limits).toEqual(limits)
		expect(body.plans[0]?.measured[0]?.limits).toEqual(limits)
		const json = JSON.stringify(body)
		expect(json).not.toContain("resets")
		expect(json).not.toContain("usedPct")
		expect(json).not.toContain("10:00")
		expect(json).not.toContain("15:00")
		expect(texts(body).filter((text) => /T\d\d:|hour/.test(text))).toEqual([])
	})

	test("prices cache reads into processed tokens and list dollars", async () => {
		const context = harness()
		await seed(
			context,
			[
				usageRow({
					hourUtc: "2026-11-24T10:00:00.000Z",
					tokensIn: 1_000_000,
					tokensOut: 0,
					cacheRead: 2_000_000,
					cacheWrite: 0,
					tokensTotal: 3_000_000,
				}),
				usageRow({
					hourUtc: "2026-11-24T11:00:00.000Z",
					tokensIn: 0,
					tokensOut: 100_000,
					cacheRead: 0,
					cacheWrite: 0,
					tokensTotal: 100_000,
				}),
			],
			[
				quotaSample({
					sampledAt: "2026-11-24T10:00:00.000Z",
					usedPct: 20,
					resetsAt: "2026-11-24T15:00:00.000Z",
				}),
				quotaSample({
					sampledAt: "2026-11-24T12:00:00.000Z",
					usedPct: 50,
					resetsAt: "2026-11-24T15:00:00.000Z",
				}),
			],
		)
		const body = (await (await read(context, "/api/peaks")).json()) as PeaksBody
		expect(body.plans[0]?.limits?.fiveHours).toEqual({
			tokens: 3_666_667,
			low: 3_548_387,
			high: 3_793_103,
			processed: { value: 10_333_333, low: 10_000_000, high: 10_689_655 },
			usd: { value: 21.33, low: 20.65, high: 22.07 },
			points: 30,
			readings: 2,
			rough: true,
		})
	})

	test("derives a meter month from the week for a vendor that states none", async () => {
		const context = harness()
		await seed(
			context,
			[
				withTotal(1_000_000, { hourUtc: "2026-11-24T10:00:00.000Z" }),
				withTotal(1_000_000, { hourUtc: "2026-11-24T11:00:00.000Z" }),
			],
			[
				quotaSample({
					window: "weekly",
					sampledAt: "2026-11-24T10:00:00.000Z",
					usedPct: 10,
					resetsAt: "2026-11-24T20:00:00.000Z",
				}),
				quotaSample({
					window: "weekly",
					sampledAt: "2026-11-24T12:00:00.000Z",
					usedPct: 30,
					resetsAt: "2026-11-24T20:00:00.000Z",
				}),
			],
		)
		const body = (await (await read(context, "/api/peaks")).json()) as PeaksBody
		expect(body.plans[0]?.limits).toEqual({
			fiveHours: null,
			sevenDays: {
				tokens: 10_000_000,
				low: 9_523_810,
				high: 10_526_316,
				processed: { value: 10_000_000, low: 9_523_810, high: 10_526_316 },
				usd: null,
				points: 20,
				readings: 2,
				rough: true,
			},
			thirtyDays: {
				tokens: 42_857_142,
				low: 40_816_328,
				high: 45_112_782,
				processed: { value: 42_857_142, low: 40_816_328, high: 45_112_782 },
				usd: null,
				points: 20,
				readings: 2,
				rough: true,
				derived: true,
			},
		})
	})
})
