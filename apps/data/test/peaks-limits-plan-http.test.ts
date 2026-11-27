import { describe, expect, test } from "bun:test"
import { quotaSample, withTotal } from "./support/fixtures"
import { harness } from "./support/http"
import type { PeaksBody } from "./support/peaks"
import { read, seed } from "./support/usage"

describe("GET /api/peaks limits by plan", () => {
	test("keeps a stated monthly window for OpenCode Go", async () => {
		const context = harness()
		await seed(
			context,
			[
				withTotal(500_000, {
					plan: "opencode-go",
					model: "grok-5",
					hourUtc: "2026-11-24T10:00:00.000Z",
				}),
				withTotal(700_000, {
					plan: "opencode-go",
					model: "grok-5",
					hourUtc: "2026-11-24T11:00:00.000Z",
				}),
			],
			[
				quotaSample({
					plan: "opencode-go",
					window: "monthly",
					sampledAt: "2026-11-24T10:00:00.000Z",
					usedPct: 20,
					resetsAt: "2026-11-30T00:00:00.000Z",
				}),
				quotaSample({
					plan: "opencode-go",
					window: "monthly",
					sampledAt: "2026-11-24T12:00:00.000Z",
					usedPct: 40,
					resetsAt: "2026-11-30T00:00:00.000Z",
				}),
			],
		)
		const body = (await (await read(context, "/api/peaks")).json()) as PeaksBody
		expect(body.plans[0]?.plan).toBe("opencode-go")
		expect(body.plans[0]?.limits?.thirtyDays).toEqual({
			tokens: 6_000_000,
			low: 5_714_286,
			high: 6_315_789,
			processed: { value: 6_000_000, low: 5_714_286, high: 6_315_789 },
			usd: null,
			points: 20,
			readings: 2,
			rough: true,
		})
		expect(body.plans[0]?.limits?.thirtyDays?.derived).toBeUndefined()
	})

	test("ignores a community contributor's meter readings", async () => {
		const context = harness()
		await seed(
			context,
			[withTotal(2_000_000, { hourUtc: "2026-11-24T10:00:00.000Z" })],
			[
				quotaSample({
					sampledAt: "2026-11-24T10:00:00.000Z",
					usedPct: 10,
					resetsAt: "2026-11-24T15:00:00.000Z",
				}),
				quotaSample({
					sampledAt: "2026-11-24T12:00:00.000Z",
					usedPct: 30,
					resetsAt: "2026-11-24T15:00:00.000Z",
				}),
			],
		)
		context.database
			.prepare(
				"INSERT INTO contributor (id, auth_user_id, handle, kind, created_at) VALUES (?, NULL, NULL, ?, ?)",
			)
			.run("community-test", "community", "2026-11-01T00:00:00.000Z")
		context.database
			.prepare(
				"INSERT INTO quota_sample (contributor_id, plan, window, sampled_at, used_pct, resets_at, received_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
			)
			.run(
				"community-test",
				"claude",
				"five_hour",
				"2026-11-24T11:00:00.000Z",
				99,
				"2026-11-24T15:00:00.000Z",
				"2026-11-24T12:00:00.000Z",
			)
		const body = (await (await read(context, "/api/peaks")).json()) as PeaksBody
		expect(body.plans[0]?.limits?.fiveHours).toEqual({
			tokens: 10_000_000,
			low: 9_523_810,
			high: 10_526_316,
			processed: { value: 10_000_000, low: 9_523_810, high: 10_526_316 },
			usd: null,
			points: 20,
			readings: 2,
			rough: true,
		})
	})
})
