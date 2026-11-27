import { describe, expect, it } from "bun:test"
import {
	DELETION_BATCH_LIMIT,
	DELETION_NOTICE_RETENTION_DAYS,
	DELETION_RETRY_BASE_SECONDS,
	DELETION_RETRY_CEILING_SECONDS,
	dueRows,
	isRetryDue,
	nextAttempts,
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
})

describe("whether a pending deletion is due", () => {
	const failedAt = Date.parse("2026-11-27T10:00:00.000Z")

	it("is not due before the base delay has passed", () => {
		expect(isRetryDue(failedAt + 60_000, failedAt, 0)).toBe(false)
	})

	it("is due at the delay and after another failed attempt", () => {
		expect(isRetryDue(retryDueAtMs(failedAt, 0), failedAt, 0)).toBe(true)
		expect(isRetryDue(failedAt + DELETION_RETRY_BASE_SECONDS * 1_000 * 2, failedAt, 1)).toBe(true)
	})

	it("is never due when the attempt time cannot be read", () => {
		expect(isRetryDue(Date.now(), Number.NaN, 0)).toBe(false)
	})

	it("counts one attempt per failed call", () => {
		expect(nextAttempts(0)).toBe(1)
		expect(nextAttempts(4)).toBe(5)
	})

	it("reads at most the batch limit per tick", () => {
		expect(DELETION_BATCH_LIMIT).toBe(50)
	})
})

describe("the batch a cron tick attempts", () => {
	const now = Date.parse("2026-11-27T10:00:00.000Z")

	it("puts sixty failing rows to the future, so a newly queued row still runs", () => {
		const failing = Array.from({ length: 60 }, (_unused, index) => ({
			id: `old-${index}`,
			// All sixty failed on this tick, so each one waits at least the base delay.
			nextAttemptAtMs: retryDueAtMs(now, 0),
		}))
		const fresh = { id: "new", nextAttemptAtMs: now }
		const farthest = Math.max(...failing.map((row) => row.nextAttemptAtMs))
		expect(farthest).toBeGreaterThan(now)

		const due = dueRows([...failing, fresh], now + 1)
		expect(due.map((row) => row.id)).toEqual(["new"])
	})

	it("reads the due rows oldest first, up to the limit", () => {
		const rows = Array.from({ length: 60 }, (_unused, index) => ({
			id: `${index}`,
			nextAttemptAtMs: now + index * 1_000,
		}))
		const due = dueRows(rows, now + 59_000)
		expect(due.length).toBe(DELETION_BATCH_LIMIT)
		expect(due[0]?.id).toBe("0")
		expect(due.at(-1)?.id).toBe("49")
	})

	it("selects nothing when every row waits for later", () => {
		expect(dueRows([{ nextAttemptAtMs: now + 1 }], now)).toEqual([])
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
