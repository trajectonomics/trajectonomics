import { describe, expect, it } from "bun:test"
import { TaxValidationError } from "./errors"
import { floorByRate, floorByRateToSatang } from "./floor-rate"

/** Rates the Thai statutory stages apply today (40(1)–(8) deductions and donation caps). */
const RATES_IN_USE = [0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6] as const

describe("floorByRate boundary values", () => {
	it("floors 180 × 0.35 to 63, where the binary product 62.999… floors to 62", () => {
		expect(Math.floor(180 * 0.35)).toBe(62)
		expect(floorByRate(180, 0.35)).toBe(63)
	})

	it("floors 180.5 × 0.35 (63.175) to 63 and 179.99 × 0.35 (62.9965) to 62", () => {
		expect(floorByRate(180.5, 0.35)).toBe(63)
		expect(floorByRate(179.99, 0.35)).toBe(62)
	})

	it("keeps an exact integer product unchanged for rates in use", () => {
		expect(floorByRate(10, 0.3)).toBe(3)
		expect(floorByRate(200_000, 0.1)).toBe(20_000)
		expect(floorByRate(1_000_000, 0.6)).toBe(600_000)
	})

	it("floors at the written value of a sub-satang amount, without rounding it to satang", () => {
		// Rounding 1.9951 to satang first would give 2.00 and floor(1.00) = 1; the written value gives 0.
		expect(floorByRate(1.9951, 0.5)).toBe(0)
		expect(floorByRate(2.0049, 0.5)).toBe(1)
	})

	it("floors a value one satang under a whole baht down, and the whole baht itself up", () => {
		expect(floorByRate(1.99, 0.5)).toBe(0)
		expect(floorByRate(2, 0.5)).toBe(1)
	})
})

describe("floorByRate edge values", () => {
	it("floors toward negative infinity, as Math.floor does", () => {
		expect(floorByRate(-0.5, 0.5)).toBe(-1)
		expect(floorByRate(-1, 0.1)).toBe(-1)
	})

	it("returns zero for a zero amount or a zero rate, and the amount itself for rate 1", () => {
		expect(floorByRate(0, 0.6)).toBe(0)
		expect(floorByRate(1000, 0)).toBe(0)
		expect(floorByRate(1000, 1)).toBe(1000)
	})

	it("handles amounts written in exponent notation", () => {
		expect(floorByRate(1e21, 0.5)).toBe(5e20)
		expect(floorByRate(5e-7, 0.5)).toBe(0)
	})

	it("passes non-finite amounts through as Math.floor does", () => {
		expect(floorByRate(Number.NaN, 0.5)).toBeNaN()
		expect(floorByRate(Number.POSITIVE_INFINITY, 0.5)).toBe(Number.POSITIVE_INFINITY)
	})

	it("rejects a rate outside [0, 1] and names the rate field", () => {
		expect(() => floorByRate(100, 1.5, "rate")).toThrow(TaxValidationError)
		try {
			floorByRate(100, Number.NaN, "statutoryRate")
		} catch (error) {
			expect(error).toBeInstanceOf(TaxValidationError)
			expect((error as TaxValidationError).field).toBe("statutoryRate")
		}
	})
})

describe("floorByRate agrees with the float floor for every rate in use", () => {
	it("returns the same whole baht as Math.floor for every satang amount up to 1,000 baht", () => {
		for (const rate of RATES_IN_USE) {
			for (let satang = 0; satang <= 100_000; satang++) {
				const amount = satang / 100
				expect(floorByRate(amount, rate)).toBe(Math.floor(amount * rate))
			}
		}
	})
})

describe("floorByRateToSatang boundary values", () => {
	it("floors to the satang, so 180 × 0.35 is 63.00 and 180.5 × 0.35 (63.175) is 63.17", () => {
		expect(floorByRateToSatang(180, 0.35)).toBe(63)
		expect(floorByRateToSatang(180.5, 0.35)).toBe(63.17)
	})

	it("floors 179.99 × 0.35 (62.9965) to 62.99, not to 62 as a whole baht floor does", () => {
		expect(floorByRateToSatang(179.99, 0.35)).toBe(62.99)
		expect(floorByRate(179.99, 0.35)).toBe(62)
	})

	it("floors at the written value of a sub-satang amount", () => {
		expect(floorByRateToSatang(1.9951, 0.5)).toBe(0.99)
		expect(floorByRateToSatang(1000.01, 0.6)).toBe(600)
	})

	it("returns the amount unchanged at rate 1 and zero at rate 0", () => {
		expect(floorByRateToSatang(1234.56, 1)).toBe(1234.56)
		expect(floorByRateToSatang(1000, 0)).toBe(0)
	})

	it("never lowers the result as the amount rises by one satang", () => {
		for (const rate of RATES_IN_USE) {
			let previous = 0
			for (let satang = 0; satang <= 100_000; satang++) {
				const current = floorByRateToSatang(satang / 100, rate)
				expect(current).toBeGreaterThanOrEqual(previous)
				previous = current
			}
		}
	})

	it("floors toward negative infinity at satang precision", () => {
		expect(floorByRateToSatang(-0.01, 0.5)).toBe(-0.01)
	})

	it("passes non-finite amounts through and rejects an invalid rate", () => {
		expect(floorByRateToSatang(Number.NaN, 0.5)).toBeNaN()
		expect(() => floorByRateToSatang(100, 1.5, "rate")).toThrow(TaxValidationError)
	})
})

describe("floorByRateToSatang agrees with exact integer satang arithmetic for every rate in use", () => {
	it("returns floor(satang × percent / 100) satang for every satang amount up to 1,000 baht", () => {
		for (const percent of [10, 15, 20, 30, 40, 50, 60]) {
			for (let satang = 0; satang <= 100_000; satang++) {
				const expected = Math.floor((satang * percent) / 100)
				expect(Math.round(floorByRateToSatang(satang / 100, percent / 100) * 100)).toBe(expected)
			}
		}
	})
})
