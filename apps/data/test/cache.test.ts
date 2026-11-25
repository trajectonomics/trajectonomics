import { describe, expect, test } from "bun:test"
import { usageCacheKey, usageStaleCacheKey } from "../src/http/cache"
import { get } from "./support/http"

describe("usageCacheKey", () => {
	test("keeps only known params in a fixed order", () => {
		const key = usageCacheKey(
			get("/api/usage?to=2026-11-24&from=2026-11-01&foo=bar&plan=claude&asOf=2026-11-20&model=x"),
		)
		expect(key.url).toBe(
			"https://data.test/api/usage?asOf=2026-11-20&from=2026-11-01&model=x&plan=claude&to=2026-11-24",
		)
	})

	test("strips a client stale marker", () => {
		const plain = usageCacheKey(get("/api/usage?from=2026-11-24"))
		const spoofed = usageCacheKey(get("/api/usage?from=2026-11-24&__stale=1&__stale=0"))
		expect(spoofed.url).toBe(plain.url)
	})

	test("gives the stale copy its own key", () => {
		const request = get("/api/usage?from=2026-11-24&__stale=1")
		expect(usageStaleCacheKey(request).url).toBe(
			"https://data.test/api/usage?from=2026-11-24&__stale=1",
		)
		expect(usageStaleCacheKey(request).url).not.toBe(usageCacheKey(request).url)
	})
})
