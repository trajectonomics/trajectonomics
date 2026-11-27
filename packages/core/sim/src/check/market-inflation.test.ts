import { describe, expect, it } from "bun:test"
import type { ReturnModel } from "../types"
import { checkReturnModel } from "./market"

const FULL = 4_294_967_296
const timeline = { start: "2026-01-01", horizon: "2027-01-01", resolution: "month" } as const

/** A valid two-bucket model, whose inflation factor is then edited by the test. */
function model(inflation?: unknown): unknown {
	return {
		id: "hand",
		accounts: ["fund"],
		buckets: [
			{ returnsBps: [0], weight: FULL / 2 },
			{ returnsBps: [1000], weight: FULL / 2 },
		],
		...(inflation === undefined ? {} : { inflation }),
	}
}

/** Buckets that total exactly 2^32: the first carries it all, the second nothing. */
function buckets(first: unknown): Record<string, unknown> {
	return { buckets: [first, { rateBps: 0, weight: 0 }] }
}

function problems(value: unknown) {
	return checkReturnModel(value, ["fund"], timeline).map(
		(problem) => `${problem.code} ${problem.path.join("/")}`,
	)
}

describe("checkReturnModel on an inflation factor", () => {
	it("accepts two buckets that total 2^32, and a model with no factor", () => {
		expect(problems(model(buckets({ rateBps: 300, weight: FULL })))).toEqual([])
		expect(problems(model())).toEqual([])
	})

	it("refuses a rate outside -9999..10000 as RATE_OUT_OF_RANGE", () => {
		for (const rateBps of [-10000, 10001]) {
			expect(problems(model(buckets({ rateBps, weight: FULL })))).toEqual([
				"RATE_OUT_OF_RANGE model/inflation/buckets/0/rateBps",
			])
		}
	})

	it("refuses a weight below 0 or above 2^32 as INVALID_WEIGHT", () => {
		for (const weight of [-1, FULL + 1]) {
			expect(problems(model(buckets({ rateBps: 300, weight })))).toEqual([
				"INVALID_WEIGHT model/inflation/buckets/0/weight",
			])
		}
	})

	it("refuses a fractional weight as NOT_SAFE_INTEGER, as the market buckets do", () => {
		expect(problems(model(buckets({ rateBps: 300, weight: 1.5 })))).toEqual([
			"NOT_SAFE_INTEGER model/inflation/buckets/0/weight",
		])
	})

	it("refuses weights that do not total 2^32, and an empty list, as RETURN_WEIGHT_TOTAL", () => {
		expect(
			problems(
				model({
					buckets: [
						{ rateBps: 300, weight: FULL / 4 },
						{ rateBps: 300, weight: FULL / 2 },
					],
				}),
			),
		).toEqual(["RETURN_WEIGHT_TOTAL model/inflation/buckets"])
		expect(problems(model({ buckets: [] }))).toEqual([
			"RETURN_WEIGHT_TOTAL model/inflation/buckets",
		])
	})

	it("refuses more than 1024 buckets as TOO_MANY_ENTRIES", () => {
		const many = Array.from({ length: 1025 }, () => ({ rateBps: 0, weight: 0 }))
		expect(problems(model({ buckets: many }))).toEqual([
			"TOO_MANY_ENTRIES model/inflation/buckets",
			"RETURN_WEIGHT_TOTAL model/inflation/buckets",
		])
	})

	it("refuses an unknown key inside the factor as UNKNOWN_KEY", () => {
		expect(problems(model({ ...buckets({ rateBps: 300, weight: FULL }), rate: 300 }))).toEqual([
			"UNKNOWN_KEY model/inflation/rate",
		])
	})

	it("refuses a bucket missing its rate or holding an unknown key", () => {
		expect(problems(model(buckets({ weight: FULL })))).toEqual([
			"MISSING_KEY model/inflation/buckets/0/rateBps",
		])
		expect(problems(model(buckets({ rateBps: 300, weight: FULL, rate: 1 })))).toEqual([
			"UNKNOWN_KEY model/inflation/buckets/0/rate",
		])
	})

	it("accepts the model `planReturnModel` builds", () => {
		const built = model(buckets({ rateBps: 300, weight: FULL })) as ReturnModel
		expect(checkReturnModel(built, ["fund"], timeline)).toEqual([])
	})
})
