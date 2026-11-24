import { describe, expect, it } from "bun:test"
import { mutate } from "../engine/mutate"
import { resolveReturns } from "../engine/return-rows"
import { createStates } from "../engine/state"
import { makeFixture } from "../engine/test-helpers"
import { valuation } from "../engine/value"
import type { DateString } from "../types"
import { type OracleChange, oracleChangedValue } from "./oracle-returns-changes"

const START = "2023-01-01"
const END = "2023-01-31"

/** One 30-day row on 300,000: the value on the 16th is 300,000 × (1 ± 10% × 15/30), exact. */
function engineValue(returnBps: number, changes: readonly OracleChange[]): bigint {
	const fixture = makeFixture({
		accounts: [{ id: "fund", kind: "asset", rate: 0 }],
		balances: { fund: 300_000 },
		surplus: [{ account: "fund" }],
		start: START,
		horizon: END,
	})
	const returns = {
		returnsVersion: 1,
		series: [{ account: "fund", rows: [{ from: START, returnBps }] }],
	} as const
	const state = createStates(
		fixture.baseline,
		fixture.scenario,
		START,
		resolveReturns(returns, fixture.timeline),
	).get("fund")!
	for (const change of changes) mutate(state, change.date, change.delta, undefined)
	return valuation(state, END)
}

function oracleValue(returnBps: number, changes: readonly OracleChange[]): bigint {
	const rows = [{ from: START, to: END as DateString, returnBps, days: 30 }]
	return oracleChangedValue(300_000n, START, changes, END, rows)
}

function both(returnBps: number, changes: readonly OracleChange[], expected: bigint): void {
	expect(oracleValue(returnBps, changes)).toBe(expected)
	expect(engineValue(returnBps, changes)).toBe(expected)
}

describe("the oracle and the engine after a mid-row drain", () => {
	it("charges a deposit the same day only its own growth (+10%)", () => {
		// 315,000 on the 16th is taken; 1,000 × (1 + 10% × 15/30) = 1,050.
		both(
			1000,
			[
				{ date: "2023-01-16", delta: -315_000n },
				{ date: "2023-01-16", delta: 1000n },
			],
			1050n,
		)
	})

	it("charges a deposit on a later day only its own growth (+10%)", () => {
		// 1,000 × (1 + 10% × 10/30) = 1,033.3
		both(
			1000,
			[
				{ date: "2023-01-16", delta: -315_000n },
				{ date: "2023-01-21", delta: 1000n },
			],
			1033n,
		)
	})

	it("credits a deposit with no loss the drain gave up (-10%)", () => {
		// 285,000 on the 16th is taken; 1,000 × (1 − 10% × 10/30) = 966.7
		both(
			-1000,
			[
				{ date: "2023-01-16", delta: -285_000n },
				{ date: "2023-01-21", delta: 1000n },
			],
			967n,
		)
	})

	it("leaves a remainder that earns nothing more (+10%)", () => {
		// 315,000 less 314,900 leaves 100, and the 14,900 taken above the 300,000 came out of growth.
		both(1000, [{ date: "2023-01-16", delta: -314_900n }], 100n)
	})

	it("keeps the part that still earns when the withdrawal is smaller (+10%)", () => {
		// 315,000 − 15,000 = 300,000 holding 285,000 to earn: 300,000 + 10% × 285,000 × 15/30 = 314,250.
		both(1000, [{ date: "2023-01-16", delta: -15_000n }], 314_250n)
	})

	it("restarts from a deposit when the remainder was floored to zero (-10%)", () => {
		// 100 left on the 16th with 15,100 still falling; on the 21st that is 100 − 251.7 < 0, so 0.
		both(
			-1000,
			[
				{ date: "2023-01-16", delta: -284_900n },
				{ date: "2023-01-21", delta: 1000n },
			],
			967n,
		)
	})
})
