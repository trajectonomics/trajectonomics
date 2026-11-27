import { describe, expect, test } from "bun:test"
import type { UsageRow } from "@trajectonomics/data-collector/types"
import { API_PATH, LEGACY_HOST, SITE_ORIGIN } from "../src/core/urls"
import { handleRequest } from "../src/http/router"
import { NOW_MS, usageRow } from "./support/fixtures"
import { get, harness, legacy } from "./support/http"
import { silenceConsoleError } from "./support/log"
import { failingEnv, read, readWith, seed } from "./support/usage"

type Peak = { tokens: number; fromDay: string }

type MeasuredTier = {
	tier: string | null
	fiveHours: Peak | null
	sevenDays: Peak | null
	thirtyDays: Peak | null
}

type PeaksBody = {
	asOf: string
	methodVersion: number
	plans: {
		plan: string
		tier: string | null
		fiveHours: Peak | null
		sevenDays: Peak | null
		thirtyDays: Peak | null
		measured: MeasuredTier[]
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

/** Every key and string value in a JSON body, to prove no hour leaves the Worker. */
function texts(value: unknown): string[] {
	if (typeof value === "string" || typeof value === "number") return [String(value)]
	if (Array.isArray(value)) return value.flatMap(texts)
	if (value !== null && typeof value === "object") {
		return Object.entries(value).flatMap(([key, entry]) => [key, ...texts(entry)])
	}
	return []
}

describe("GET /api/peaks", () => {
	test("serves the three peaks, summed over models and machines, without an hour anywhere", async () => {
		const context = harness()
		await seed(context, [
			withTotal(100, { hourUtc: "2026-11-24T10:00:00.000Z" }),
			withTotal(50, { hourUtc: "2026-11-24T10:00:00.000Z", model: "claude-sonnet-5-5" }),
			withTotal(25, { hourUtc: "2026-11-24T10:00:00.000Z", machine: "m-89abcdef" }),
			withTotal(25, { hourUtc: "2026-11-24T11:00:00.000Z" }),
		])
		const response = await read(context, "/api/peaks")
		expect(response.status).toBe(200)
		const body = (await response.json()) as PeaksBody
		expect(body.asOf).toBe("2026-11-25")
		expect(body.methodVersion).toBe(1)
		expect(body.plans).toEqual([
			{
				plan: "claude",
				tier: "Max",
				fiveHours: { tokens: 200, fromDay: "2026-11-24" },
				sevenDays: { tokens: 200, fromDay: "2026-11-24" },
				thirtyDays: { tokens: 200, fromDay: "2026-11-24" },
				measured: [
					{
						tier: "Max",
						fiveHours: { tokens: 200, fromDay: "2026-11-24" },
						sevenDays: { tokens: 200, fromDay: "2026-11-24" },
						thirtyDays: { tokens: 200, fromDay: "2026-11-24" },
					},
				],
			},
		])
		expect(body.plans[0]?.measured).toHaveLength(1)
		expect(texts(body).filter((text) => /T\d\d:|hour/.test(text))).toEqual([])
	})

	test("keeps a plan we cannot name without a tier", async () => {
		const context = harness()
		await seed(context, [
			usageRow({ plan: "meta", model: "muse-ember-1.0", source: "t3-muse", bestEffort: true }),
		])
		const body = (await (await read(context, "/api/peaks")).json()) as PeaksBody
		expect(body.plans[0]).toMatchObject({ plan: "meta", tier: null })
	})

	test("leaves the five-hour peak null for a daily-only plan", async () => {
		const context = harness()
		await seed(context, [
			withTotal(500, {
				plan: "mistral",
				model: "mistral-large-4",
				hourUtc: "2026-11-20T00:00:00.000Z",
				granularity: "day",
				source: "mistral-csv",
			}),
			withTotal(700, {
				plan: "mistral",
				model: "mistral-large-4",
				hourUtc: "2026-11-21T00:00:00.000Z",
				granularity: "day",
				source: "mistral-csv",
			}),
		])
		const body = (await (await read(context, "/api/peaks")).json()) as PeaksBody
		expect(body.plans[0]).toEqual({
			plan: "mistral",
			tier: "Pro",
			fiveHours: null,
			sevenDays: { tokens: 1200, fromDay: "2026-11-20" },
			thirtyDays: { tokens: 1200, fromDay: "2026-11-20" },
			measured: [
				{
					tier: "Pro",
					fiveHours: null,
					sevenDays: { tokens: 1200, fromDay: "2026-11-20" },
					thirtyDays: { tokens: 1200, fromDay: "2026-11-20" },
				},
			],
		})
	})

	test("caps the peaks at asOf and reports it back", async () => {
		const context = harness()
		await seed(context, [
			withTotal(100, { hourUtc: "2026-11-24T10:00:00.000Z" }),
			withTotal(900, { hourUtc: "2026-11-25T10:00:00.000Z" }),
		])
		const body = (await (await read(context, "/api/peaks?asOf=2026-11-24")).json()) as PeaksBody
		expect(body.asOf).toBe("2026-11-24")
		expect(body.plans[0]?.fiveHours).toEqual({ tokens: 100, fromDay: "2026-11-24" })
		expect(body.plans[0]?.thirtyDays?.tokens).toBe(100)
	})

	test("sends the public cache headers", async () => {
		const context = harness()
		await seed(context, [usageRow()])
		const response = await read(context, "/api/peaks")
		expect(response.headers.get("cache-control")).toBe("public, max-age=3600, stale-if-error=86400")
	})

	test("serves the cached copy when D1 fails", async () => {
		const context = harness()
		const restore = silenceConsoleError()
		await seed(context, [usageRow()])
		const first = await read(context, "/api/peaks")
		expect(first.status).toBe(200)
		const firstBody = await first.text()
		const second = await readWith(context, failingEnv(context), "/api/peaks")
		expect(second.status).toBe(200)
		expect(await second.text()).toBe(firstBody)
		restore()
	})

	test("rejects a bad asOf with 400", async () => {
		const context = harness()
		const response = await read(context, "/api/peaks?asOf=soon")
		expect(response.status).toBe(400)
		expect(await response.text()).toContain("INVALID_DATE")
	})

	test("accepts GET only", async () => {
		const context = harness()
		const request = new Request(`${SITE_ORIGIN}${API_PATH}/peaks`, { method: "POST" })
		const response = await handleRequest(request, context.env, { nowMs: NOW_MS })
		expect(response.status).toBe(405)
		expect(response.headers.get("allow")).toBe("GET")
	})

	test("answers the old host's /api/peaks without a redirect", async () => {
		const context = harness()
		await seed(context, [usageRow()])
		const response = await handleRequest(
			new Request(`https://${LEGACY_HOST}/api/peaks?asOf=2026-11-24`),
			context.env,
			{ nowMs: NOW_MS, cache: context.cache },
		)
		expect(response.status).toBe(200)
		expect(response.headers.get("location")).toBeNull()
		const body = (await response.json()) as PeaksBody
		expect(body.asOf).toBe("2026-11-24")
	})

	test("shares one cached copy between the apex and the old host", async () => {
		const context = harness()
		const restore = silenceConsoleError()
		await seed(context, [usageRow()])
		const first = await handleRequest(get("/api/peaks?asOf=2026-11-24"), context.env, {
			nowMs: NOW_MS,
			cache: context.cache,
		})
		expect(first.status).toBe(200)
		const firstBody = await first.text()
		const second = await handleRequest(legacy("/api/peaks?asOf=2026-11-24"), failingEnv(context), {
			nowMs: NOW_MS,
			cache: context.cache,
		})
		expect(second.status).toBe(200)
		expect(await second.text()).toBe(firstBody)
		restore()
	})
})
