import { describe, expect, test } from "bun:test"
import { cacheShare, cacheShareLabel } from "./cache-share"

describe("a cache-read share", () => {
	test("divides the cache reads by every token counted", () => {
		expect(cacheShare(100, 900)).toBe(0.9)
		expect(cacheShare(0, 5)).toBe(1)
	})

	test("is absent when the body has no cache reads", () => {
		expect(cacheShare(100, null)).toBeNull()
		expect(cacheShare(100, undefined)).toBeNull()
		expect(cacheShare(0, 0)).toBeNull()
	})

	test("writes whole words, and nothing when the share rounds to zero", () => {
		expect(cacheShareLabel(0.99)).toBe("99% cache reads")
		expect(cacheShareLabel(0.0001)).toBe("<1% cache reads")
		expect(cacheShareLabel(0)).toBeNull()
		expect(cacheShareLabel(null)).toBeNull()
	})
})
