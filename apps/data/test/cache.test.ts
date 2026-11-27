import { describe, expect, test } from "bun:test"
import {
	healthCacheKey,
	peaksCacheKey,
	peaksStaleCacheKey,
	usageCacheKey,
	usageStaleCacheKey,
} from "../src/http/cache"
import { get, legacy } from "./support/http"

describe("usageCacheKey", () => {
	test("keeps only known params in a fixed order", () => {
		const key = usageCacheKey(
			get("/api/usage?to=2026-11-24&from=2026-11-01&foo=bar&plan=claude&asOf=2026-11-20&model=x"),
		)
		expect(key.url).toBe(
			"https://trajectonomics.com/data/api/usage?asOf=2026-11-20&from=2026-11-01&model=x&plan=claude&to=2026-11-24",
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
			"https://trajectonomics.com/data/api/usage?from=2026-11-24&__stale=1",
		)
		expect(usageStaleCacheKey(request).url).not.toBe(usageCacheKey(request).url)
	})

	test("names one resource from either host", () => {
		const apex = usageCacheKey(get("/api/usage?from=2026-11-24&plan=claude"))
		const old = usageCacheKey(legacy("/api/usage?plan=claude&from=2026-11-24"))
		expect(old.url).toBe(apex.url)
	})
})

describe("peaksCacheKey", () => {
	test("keeps the as-of day and drops every other param", () => {
		const key = peaksCacheKey(get("/api/peaks?plan=claude&asOf=2026-11-20&from=2026-11-01"))
		expect(key.url).toBe("https://trajectonomics.com/data/api/peaks?asOf=2026-11-20&shape=5")
	})

	test("gives the stale copy its own key", () => {
		const request = get("/api/peaks?asOf=2026-11-20")
		expect(peaksStaleCacheKey(request).url).toBe(
			"https://trajectonomics.com/data/api/peaks?asOf=2026-11-20&shape=5&__stale=1",
		)
		expect(peaksStaleCacheKey(request).url).not.toBe(peaksCacheKey(request).url)
	})

	test("names one resource from either host", () => {
		expect(peaksCacheKey(legacy("/api/peaks?asOf=2026-11-20")).url).toBe(
			peaksCacheKey(get("/api/peaks?asOf=2026-11-20")).url,
		)
	})
})

describe("healthCacheKey", () => {
	test("drops the query and names one resource from either host", () => {
		expect(healthCacheKey(legacy("/api/health?from=elsewhere")).url).toBe(
			"https://trajectonomics.com/data/api/health",
		)
		expect(healthCacheKey(legacy("/api/health?from=elsewhere")).url).toBe(
			healthCacheKey(get("/api/health")).url,
		)
	})
})
