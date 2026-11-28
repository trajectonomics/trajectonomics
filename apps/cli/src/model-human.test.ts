import { describe, expect, it } from "bun:test"
import { modelHint } from "./projection/model-human"

/*
 * The human form of `projection model` (cli ADR-0085): the inflation line's mean is the weighted
 * mean of the factor's buckets, so the line states the rate the model actually draws.
 */

const TWO_32 = 4_294_967_296

describe("the projection model's inflation line", () => {
	it("weights the mean by weight / 2^32, not by bucket", () => {
		const inflation = {
			buckets: [
				{ rateBps: 0, weight: (TWO_32 * 3) / 4 },
				{ rateBps: 1000, weight: TWO_32 / 4 },
			],
		}
		expect(modelHint.blocks?.({ inflation })).toEqual([
			"Inflation: 2 buckets, mean 250 bps, from 0 to 1000 bps a year",
		])
	})

	it("rounds a half of a basis point up, as the line did before it was weighted", () => {
		const half = TWO_32 / 2
		const line = (a: number, b: number) =>
			modelHint.blocks?.({
				inflation: {
					buckets: [
						{ rateBps: a, weight: half },
						{ rateBps: b, weight: half },
					],
				},
			})
		expect(line(2, 3)).toEqual(["Inflation: 2 buckets, mean 3 bps, from 2 to 3 bps a year"])
		expect(line(-3, -2)).toEqual(["Inflation: 2 buckets, mean -2 bps, from -3 to -2 bps a year"])
	})

	it("states no line without a factor, as the model without one prints as before", () => {
		expect(modelHint.blocks?.({})).toEqual([])
	})
})
