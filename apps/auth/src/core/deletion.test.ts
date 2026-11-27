import { describe, expect, it } from "bun:test"
import {
	DELETION_BATCH_LIMIT,
	DELETION_RETRY_BASE_SECONDS,
	DELETION_RETRY_CEILING_SECONDS,
	isRetryDue,
	nextAttempts,
	retryCutoffMs,
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
})

describe("whether a pending deletion is due", () => {
	const requestedAt = Date.parse("2026-11-27T10:00:00.000Z")

	it("is not due before the base delay has passed", () => {
		expect(isRetryDue(requestedAt + 60_000, requestedAt, 0)).toBe(false)
	})

	it("is due at the delay and after another failed attempt", () => {
		expect(isRetryDue(retryDueAtMs(requestedAt, 0), requestedAt, 0)).toBe(true)
		expect(isRetryDue(requestedAt + DELETION_RETRY_BASE_SECONDS * 1_000 * 2, requestedAt, 1)).toBe(
			true,
		)
	})

	it("is never due when the request time cannot be read", () => {
		expect(isRetryDue(Date.now(), Number.NaN, 0)).toBe(false)
	})

	it("filters by the earliest any retry can be due", () => {
		expect(retryCutoffMs(requestedAt + 600_000)).toBe(
			requestedAt + 600_000 - DELETION_RETRY_BASE_SECONDS * 1_000,
		)
	})

	it("counts one attempt per failed call", () => {
		expect(nextAttempts(0)).toBe(1)
		expect(nextAttempts(4)).toBe(5)
	})

	it("reads at most the batch limit per tick", () => {
		expect(DELETION_BATCH_LIMIT).toBe(50)
	})
})
