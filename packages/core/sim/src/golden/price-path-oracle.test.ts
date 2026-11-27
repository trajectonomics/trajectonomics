import { describe, expect, it } from "bun:test"
import { addDays, addMonthsClamped } from "../calendar/arith"
import { countedDays } from "../calendar/counted"
import { deflateBy, inflateBy, type PricePath } from "../money/inflation"
import { priceChangeBps } from "../money/price-path"
import { oracleChangeBps, oracleDeflate, oracleInflate } from "./oracle-price-path"

const START = "2026-01-01"
const OUTSIDE = 250

function ratesOf(seed: number): readonly number[] {
	let state = seed
	return Array.from({ length: 30 }, () => {
		state = (state * 1_103_515_245 + 12_345) % 2_147_483_648
		return (state % 1401) - 400
	})
}

const PATHS: readonly PricePath[] = [
	...[1, 7, 2026].map((seed) => ({ start: START, ratesBps: ratesOf(seed), outsideBps: OUTSIDE })),
	// The ends of the range a price path may state, so no product is ever near zero by accident.
	{ start: START, ratesBps: [-9999, 10_000, -9999, 10_000], outsideBps: -9999 },
]

describe("a Price path against an exact-rational oracle", () => {
	it("inflates by whole years before, through and past the drawn years", () => {
		const amount = 10n ** 15n + 7n
		for (const path of PATHS) {
			for (const endYear of [2, 35]) {
				const date = addMonthsClamped(path.start, endYear * 12)
				for (let n = 0; n <= 40; n++) {
					expect(inflateBy(amount, path, n, date)).toBe(
						oracleInflate(amount, path.ratesBps, path.outsideBps, n, endYear),
					)
				}
			}
		}
	})

	it("deflates by counted days, linearly inside the last year", () => {
		const amount = 10n ** 15n + 7n
		for (const path of PATHS) {
			for (const days of [0, 1, 364, 365, 731, 3650, 3650 + 364]) {
				expect(deflateBy(amount, path, days)).toBe(
					oracleDeflate(amount, path.ratesBps, path.outsideBps, days),
				)
			}
		}
	})

	it("inflates to a mid-year date the engine counts as that year", () => {
		const amount = 10n ** 15n + 7n
		const mid = addDays(addMonthsClamped(START, 12), 200)
		for (const path of PATHS) {
			for (let n = 0; n <= 5; n++) {
				expect(inflateBy(amount, path, n, mid)).toBe(
					oracleInflate(amount, path.ratesBps, path.outsideBps, n, 1),
				)
			}
		}
	})

	it("inflates a date before the path's start from year 0, so only the outside rate applies", () => {
		const amount = 10n ** 15n + 7n
		const before = addDays(START, -1)
		for (const path of PATHS) {
			expect(inflateBy(amount, path, 0, before)).toBe(amount)
			for (const n of [1, 2, 5]) {
				expect(inflateBy(amount, path, n, before)).toBe(
					oracleInflate(amount, path.ratesBps, path.outsideBps, n, 0),
				)
			}
		}
	})

	it("reports the roll-up change in whole basis points", () => {
		for (const path of PATHS) {
			for (const [from, to] of [
				[path.start, addMonthsClamped(path.start, 12)],
				[addMonthsClamped(path.start, 12), addMonthsClamped(path.start, 24)],
			] as const) {
				const fromDays = countedDays(path.start, from)
				const toDays = countedDays(path.start, to) + 1
				expect(priceChangeBps(path, from, to)).toBe(
					oracleChangeBps(path.ratesBps, path.outsideBps, fromDays, toDays),
				)
			}
		}
	})
})
