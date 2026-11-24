import { describe, expect, test } from "bun:test"
import { editSchema } from "./edit"
import {
	RECORD_VALUE_MAX_LENGTH,
	RECORD_VALUES_MAX_ROWS,
	recordValuesSchema,
	unknownAccountIds,
} from "./record-values"

const row = { account: "bank", date: "2026-10-31", value: "1000.00" }
const edit = { kind: "record-values", against: "gains", values: [row] }

describe("the record-values schema", () => {
	test("is part of the Edit list and takes the values as typed text", () => {
		expect(editSchema.safeParse(edit).success).toBe(true)
		expect(
			recordValuesSchema.parse({ ...edit, values: [{ ...row, value: " 1,000.5 " }] }),
		).toBeTruthy()
	})

	test("is strict: an extra field on the Edit or on a row is refused", () => {
		expect(editSchema.safeParse({ ...edit, force: true }).success).toBe(false)
		expect(editSchema.safeParse({ ...edit, values: [{ ...row, memo: "x" }] }).success).toBe(false)
	})

	test("refuses a date that is not a calendar date", () => {
		for (const date of ["2026-02-30", "31/10/2026", "2026-10-31T00:00", ""]) {
			expect(editSchema.safeParse({ ...edit, values: [{ ...row, date }] }).success).toBe(false)
		}
	})

	test("bounds the text of a value and the number of rows, and wants at least one row", () => {
		const long = "9".repeat(RECORD_VALUE_MAX_LENGTH + 1)
		expect(editSchema.safeParse({ ...edit, values: [{ ...row, value: long }] }).success).toBe(false)
		expect(editSchema.safeParse({ ...edit, values: [{ ...row, value: "" }] }).success).toBe(false)
		expect(editSchema.safeParse({ ...edit, values: [] }).success).toBe(false)
		const many = Array.from({ length: RECORD_VALUES_MAX_ROWS + 1 }, () => row)
		expect(editSchema.safeParse({ ...edit, values: many }).success).toBe(false)
		expect(editSchema.safeParse({ ...edit, values: many.slice(1) }).success).toBe(true)
	})
})

describe("the row bound", () => {
	test("holds a ten-year history of 33 accounts, and still fits the server's body cap in its worst case", () => {
		expect(RECORD_VALUES_MAX_ROWS).toBe(4000)
		expect(33 * 10 * 12).toBeLessThanOrEqual(RECORD_VALUES_MAX_ROWS)
		const longest = {
			account: "a".repeat(100),
			date: "2026-10-31",
			value: "9".repeat(RECORD_VALUE_MAX_LENGTH),
		}
		const body = JSON.stringify({
			kind: "record-values",
			against: "g".repeat(100),
			values: Array.from({ length: RECORD_VALUES_MAX_ROWS }, () => longest),
			preview: true,
		})
		expect(editSchema.safeParse(JSON.parse(body)).success).toBe(true)
		// `maxRequestBodySize` of scripts/serve.ts is 1 MiB, and the CLI's own document limit is 5,000 values.
		expect(new TextEncoder().encode(body).length).toBeLessThan(1024 * 1024)
	})
})

describe("unknownAccountIds", () => {
	const account = (id: string) => ({
		id,
		name: id,
		type: "asset" as const,
		currency: "THB",
		parentId: null,
		archivedAt: null,
		version: 1,
		createdAt: "",
		updatedAt: "",
	})

	test("names the ids the Snapshot's chart does not hold, once each, the against first", () => {
		const parsed = recordValuesSchema.parse({
			...edit,
			values: [row, { ...row, account: "ghost" }, { ...row, account: "ghost", date: "2026-10-30" }],
		})
		expect(unknownAccountIds(parsed, [account("bank")])).toEqual(["gains", "ghost"])
		expect(
			unknownAccountIds(parsed, [account("bank"), account("gains"), account("ghost")]),
		).toEqual([])
	})
})
