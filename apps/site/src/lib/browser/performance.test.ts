import { describe, expect, it } from "bun:test"
import {
	checkPerformance,
	medianScore,
	PERFORMANCE_MIN_SCORE,
	PERFORMANCE_RUNS,
} from "./performance"

describe("the mobile performance budget", () => {
	it("is at least 0.95, the median of 3 runs", () => {
		expect(PERFORMANCE_MIN_SCORE).toBe(0.95)
		expect(PERFORMANCE_RUNS).toBe(3)
	})

	it("takes the middle run, not the best or the mean", () => {
		expect(medianScore([0.9, 1, 0.96])).toBe(0.96)
		expect(medianScore([1, 0.8, 0.9])).toBe(0.9)
	})

	it("passes a page whose median is exactly 0.95", () => {
		expect(checkPerformance("/th/", [0.95, 0.95, 0.95])).toEqual([])
		expect(checkPerformance("/", [0.9, 1, 0.95])).toEqual([])
	})

	it("fails a page whose median is below 0.95", () => {
		const failures = checkPerformance("/th/", [0.9, 0.9, 0.96])
		expect(failures.map((failure) => failure.code)).toEqual(["LIGHTHOUSE_SCORE_TOO_LOW"])
		expect(failures[0]?.path).toBe("/th/")
	})

	it("fails when one run has no score, rather than judging the rest", () => {
		expect(medianScore([0.99, undefined, 0.99])).toBeUndefined()
		expect(checkPerformance("/", [0.99, undefined, 0.99]).map((failure) => failure.code)).toEqual([
			"LIGHTHOUSE_SCORE_MISSING",
		])
	})

	it("fails when fewer than 3 runs were made", () => {
		expect(checkPerformance("/", [0.99, 0.99]).map((failure) => failure.code)).toEqual([
			"LIGHTHOUSE_SCORE_MISSING",
		])
	})
})
