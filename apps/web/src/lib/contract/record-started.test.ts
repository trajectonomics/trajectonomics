import { describe, expect, test } from "bun:test"

import { balance } from "./balance"
import { baseline } from "./baseline"

const BALANCE = { asOf: "2026-03-31", rows: [], netWorth: [] }
const BASELINE = { asOf: "2026-03-31", currency: "THB", rows: [] }
const STARTED = { firstTransactionDate: "2026-01-01", noTransactionsBefore: false }
const EMPTY = { firstTransactionDate: null, noTransactionsBefore: true }

describe("the record-started pair on balance and baseline show", () => {
	test("parses a result that states it, with or without a first date", () => {
		for (const pair of [STARTED, EMPTY]) {
			expect(balance.parse({ ...BALANCE, ...pair })).toMatchObject(pair)
			expect(baseline.parse({ ...BASELINE, ...pair })).toMatchObject(pair)
		}
	})

	test("still parses a result from a traj that did not state it", () => {
		expect(balance.safeParse(BALANCE).success).toBe(true)
		expect(baseline.safeParse(BASELINE).success).toBe(true)
	})

	test("stays strict about every other key and about the pair's types", () => {
		expect(balance.safeParse({ ...BALANCE, extra: 1 }).success).toBe(false)
		expect(baseline.safeParse({ ...BASELINE, extra: 1 }).success).toBe(false)
		expect(balance.safeParse({ ...BALANCE, noTransactionsBefore: "yes" }).success).toBe(false)
		expect(baseline.safeParse({ ...BASELINE, firstTransactionDate: "soon" }).success).toBe(false)
	})
})
