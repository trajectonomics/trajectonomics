import { describe, expect, it } from "bun:test"
import {
	DELETION_BATCH_LIMIT,
	DELETION_NOTICE_RETENTION_DAYS,
	DELETION_RETRY_BASE_SECONDS,
	DELETION_RETRY_CEILING_SECONDS,
	purgeCutoffMs,
	retryDelaySeconds,
	retryDueAtMs,
	safeAttempts,
} from "./deletion"

describe("the deletion retry delay", () => {
	it("waits the base delay before the first retry", () => {
		expect(retryDelaySeconds(0)).toBe(DELETION_RETRY_BASE_SECONDS)
	})

	it("doubles with each failed attempt", () => {
		expect(retryDelaySeconds(1)).toBe(DELETION_RETRY_BASE_SECONDS * 2)
		expect(retryDelaySeconds(3)).toBe(DELETION_RETRY_BASE_SECONDS * 8)
	})

	it("stops growing at the ceiling", () => {
		expect(retryDelaySeconds(40)).toBe(DELETION_RETRY_CEILING_SECONDS)
	})

	it("reads a broken attempt count as none", () => {
		expect(safeAttempts(-3)).toBe(0)
		expect(safeAttempts(Number.NaN)).toBe(0)
		expect(safeAttempts(2.9)).toBe(2)
	})

	it("moves a failed row five minutes out, then further", () => {
		const failedAt = Date.parse("2026-11-27T10:00:00.000Z")
		expect(retryDueAtMs(failedAt, 0)).toBe(failedAt + DELETION_RETRY_BASE_SECONDS * 1_000)
		expect(retryDueAtMs(failedAt, 1)).toBe(failedAt + DELETION_RETRY_BASE_SECONDS * 2_000)
	})

	it("reads at most the batch limit per tick", () => {
		expect(DELETION_BATCH_LIMIT).toBe(50)
	})
})

describe("purging an acknowledged notice", () => {
	it("keeps it thirty days after the data site confirmed", () => {
		const now = Date.parse("2026-11-27T10:00:00.000Z")
		const day = 86_400_000
		expect(purgeCutoffMs(now)).toBe(now - DELETION_NOTICE_RETENTION_DAYS * day)
		expect(purgeCutoffMs(now) < now - 29 * day).toBe(true)
		expect(purgeCutoffMs(now) > now - 31 * day).toBe(true)
	})
})
