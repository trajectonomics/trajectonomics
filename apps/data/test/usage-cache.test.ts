import { describe, expect, test } from "bun:test"
import { usageRow } from "./support/fixtures"
import { harness } from "./support/http"
import { silenceConsoleError } from "./support/log"
import { failingEnv, read, readWith, seed } from "./support/usage"

describe("GET /api/usage caching", () => {
	test("serves the cached copy when D1 fails, keyed by the normalised URL", async () => {
		const context = harness()
		await seed(context, [usageRow()])
		const first = await read(context, "/api/usage?from=2026-11-24&plan=claude")
		expect(first.status).toBe(200)
		const firstBody = await first.text()
		const second = await readWith(
			context,
			failingEnv(context),
			"/api/usage?plan=claude&from=2026-11-24",
		)
		expect(second.status).toBe(200)
		expect(await second.text()).toBe(firstBody)
	})

	test("serves the stale copy after the fresh copy expires", async () => {
		const context = harness()
		const restore = silenceConsoleError()
		await seed(context, [usageRow()])
		const first = await read(context, "/api/usage?from=2026-11-24")
		expect(first.status).toBe(200)
		const firstBody = await first.text()
		context.cache.now.value += 3_601_000
		const second = await readWith(context, failingEnv(context), "/api/usage?from=2026-11-24")
		expect(second.status).toBe(200)
		expect(second.headers.get("x-data-stale")).toBe("1")
		expect(await second.text()).toBe(firstBody)
		restore()
	})

	test("returns 503 when D1 fails and the stale copy expired too", async () => {
		const context = harness()
		const restore = silenceConsoleError()
		await seed(context, [usageRow()])
		const first = await read(context, "/api/usage?from=2026-11-24")
		expect(first.status).toBe(200)
		context.cache.now.value += 86_400_000 + 3_601_000
		const second = await readWith(context, failingEnv(context), "/api/usage?from=2026-11-24")
		expect(second.status).toBe(503)
		restore()
	})

	test("returns 503 when D1 fails with no cached copy", async () => {
		const context = harness()
		const restore = silenceConsoleError()
		const response = await readWith(context, failingEnv(context), "/api/usage")
		expect(response.status).toBe(503)
		restore()
	})

	test("caches an invalid query for one hour", async () => {
		const context = harness()
		const restore = silenceConsoleError()
		const path = `/api/usage?model=${"x".repeat(70)}`
		const first = await read(context, path)
		expect(first.status).toBe(400)
		expect(first.headers.get("cache-control")).toBe("public, max-age=3600")
		const second = await readWith(context, failingEnv(context), path)
		expect(second.status).toBe(400)
		restore()
	})
})
