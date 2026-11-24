import { describe, expect, it } from "bun:test"
import { mutate } from "../engine/mutate"
import { resolveReturns } from "../engine/return-rows"
import { createStates } from "../engine/state"
import { makeFixture } from "../engine/test-helpers"
import { valuation } from "../engine/value"
import { builtModel } from "./plan-model-fixture"

const fund = { id: "fund", kind: "asset", rate: 700, volatility: 1500 } as const
const BUCKETS = builtModel([fund], 256).buckets.map((bucket) => bucket.returnsBps[0]!)
const OPENING = 1_000_000_000n
const BASIS_POINT = OPENING / 10_000n

function monthStart(month: number): string {
	return month > 12 ? "2028-01-01" : `2027-${String(month).padStart(2, "0")}-01`
}

/** The mean over the 256 buckets of one month of `balance` that changes by `delta` on each of `days`. */
function meanMonth(balance: bigint, month: number, days: readonly number[], delta: bigint): bigint {
	const start = monthStart(month)
	const horizon = monthStart(month + 1)
	const fixture = makeFixture({
		accounts: [fund],
		balances: { fund: Number(balance) },
		surplus: [{ account: "fund" }],
		start,
		horizon,
	})
	let total = 0n
	for (const returnBps of BUCKETS) {
		const returns = {
			returnsVersion: 1,
			series: [{ account: "fund", rows: [{ from: start, returnBps }] }],
		} as const
		const states = createStates(
			fixture.baseline,
			fixture.scenario,
			start,
			resolveReturns(returns, fixture.timeline),
		)
		const state = states.get("fund")!
		for (const day of days)
			mutate(state, `${start.slice(0, 8)}${String(day).padStart(2, "0")}`, delta, undefined)
		total += valuation(state, horizon)
	}
	return total / BigInt(BUCKETS.length)
}

/** The expected value after twelve months, each with the same changes: the draws of a month are independent. */
function expectedYear(days: readonly number[]): bigint {
	let balance = OPENING
	for (let month = 1; month <= 12; month++) balance = meanMonth(balance, month, days, 0n)
	return balance
}

describe("a change inside a month on a 7% Account with 15% volatility", () => {
	it("keeps the expected year at the stated 700 bps with no change", () => {
		const gap = expectedYear([]) - (OPENING * 107n) / 100n
		expect(gap >= -BASIS_POINT && gap <= BASIS_POINT).toBe(true)
	})

	it("keeps the expected year within 1 bp of 700 bps with one change mid-month (was 760.7)", () => {
		const gap = expectedYear([15]) - (OPENING * 107n) / 100n
		expect(gap >= -BASIS_POINT && gap <= BASIS_POINT).toBe(true)
	})

	it("keeps the expected year within 1 bp of 700 bps with four weekly changes (was 791.2)", () => {
		const gap = expectedYear([5, 12, 19, 26]) - (OPENING * 107n) / 100n
		expect(gap >= -BASIS_POINT && gap <= BASIS_POINT).toBe(true)
	})
})
