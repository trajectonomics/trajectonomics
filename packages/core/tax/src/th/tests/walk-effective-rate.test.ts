import { describe, expect, it } from "bun:test"
import { TaxValidationError } from "../../core/money"
import { thEffectiveRateBps } from "../walk"

describe("thEffectiveRateBps", () => {
	it("floors due x 10000 / assessable", () => {
		// 17,500 THB due on 600,000 THB assessable is 2.9166...%, so 291 bps.
		expect(thEffectiveRateBps(1_750_000, 60_000_000)).toBe(291)
	})

	it("is exact when the division is exact", () => {
		expect(thEffectiveRateBps(1_000, 10_000)).toBe(1000)
		expect(thEffectiveRateBps(0, 10_000)).toBe(0)
	})

	it("is absent when nothing was assessed", () => {
		expect(thEffectiveRateBps(0, 0)).toBeUndefined()
	})

	it("floors a refund toward minus infinity and keeps an exact one", () => {
		expect(thEffectiveRateBps(-1, 3)).toBe(-3334)
		expect(thEffectiveRateBps(-3, 10_000)).toBe(-3)
	})

	it("does not lose a product past the safe integers", () => {
		expect(thEffectiveRateBps(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)).toBe(10_000)
	})

	it("refuses an amount that is not whole satang, or an assessable income below zero", () => {
		expect(() => thEffectiveRateBps(0.5, 100)).toThrow(TaxValidationError)
		expect(() => thEffectiveRateBps(1, -100)).toThrow(TaxValidationError)
	})
})
