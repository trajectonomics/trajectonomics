import { describe, expect, test } from "bun:test"
import { batchRows, batchRowsWithin, MAX_BATCH_BYTES, type SendBatch } from "../src/send/batch"
import { quotaRow, usageRow } from "./support/rows"

const encoder = new TextEncoder()

function bytes(batch: SendBatch): number {
	return encoder.encode(batch.body).byteLength
}

function body(batch: SendBatch): { usage: unknown[]; quota: unknown[] } {
	return JSON.parse(batch.body) as { usage: unknown[]; quota: unknown[] }
}

describe("batchRows", () => {
	test("splits at 5,000 rows", () => {
		const rows = Array.from({ length: 5_001 }, (_, index) => usageRow({ model: `model-${index}` }))
		const batches = batchRowsWithin(rows, 5_000, 10_000_000)

		expect(batches.map((batch) => batch.usage.length)).toEqual([5_000, 1])
		expect(batches.flatMap((batch) => batch.usage)).toHaveLength(5_001)
	})

	test("splits before a body would exceed the byte limit", () => {
		const rows = Array.from({ length: 6 }, (_, index) =>
			usageRow({ model: `${index}-${"x".repeat(80)}` }),
		)
		const batches = batchRowsWithin(rows, 5_000, 500)

		expect(batches.length).toBeGreaterThan(1)
		expect(batches.every((batch) => bytes(batch) <= 500)).toBe(true)
		expect(batches.flatMap((batch) => batch.usage)).toHaveLength(6)
	})

	test("keeps the default 1 MiB body limit across a realistic row count", () => {
		const rows = Array.from({ length: 5_001 }, (_, index) => usageRow({ model: `model-${index}` }))
		const batches = batchRows(rows)

		expect(batches.length).toBeGreaterThan(1)
		expect(batches.every((batch) => bytes(batch) <= MAX_BATCH_BYTES)).toBe(true)
		expect(batches.flatMap((batch) => batch.usage)).toHaveLength(5_001)
	})

	test("keeps usage and quota in their own arrays", () => {
		const batches = batchRowsWithin([usageRow(), quotaRow(), usageRow()], 10, 10_000)
		expect(batches).toHaveLength(1)
		const first = batches[0]
		expect(first?.usage).toHaveLength(2)
		expect(first?.quota).toHaveLength(1)
		expect(body(first as SendBatch).quota).toHaveLength(1)
	})

	test("rejects a single row larger than the body limit", () => {
		const row = usageRow({ model: "x".repeat(500) })
		expect(() => batchRowsWithin([row], 10, 200)).toThrow("larger than the 200-byte")
	})

	test("rejects limits that cannot hold one row", () => {
		expect(() => batchRowsWithin([], 0, 10_000)).toThrow()
		expect(() => batchRowsWithin([], 10, 10)).toThrow()
	})
})
