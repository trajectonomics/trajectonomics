import { describe, expect, it } from "bun:test"
import type { Levy, LevyMeasure } from "../types"
import { contributionSavings } from "./savings"
import { optionsOf, reported } from "./test-savings"

/** One band of net income `[lo, lo + width)` taxed at `percent`, in satang (the Thai 2026 ladder). */
function band(n: number, loThb: number, widthThb: number, percent: number): readonly LevyMeasure[] {
	return [
		{ id: `lo${n}`, op: "const", value: loThb * 100 },
		{ id: `width${n}`, op: "const", value: widthThb * 100 },
		{ id: `above${n}`, op: "sub", a: "net", b: `lo${n}` },
		{ id: `inside${n}`, op: "max", a: `above${n}`, b: "zero" },
		{ id: `capped${n}`, op: "min", a: `inside${n}`, b: `width${n}` },
		{ id: `tax${n}`, op: "scale", of: `capped${n}`, num: percent, den: 100, rounding: "halfUp" },
	]
}

const BANDS: readonly (readonly [number, number, number])[] = [
	[150_000, 150_000, 5],
	[300_000, 200_000, 10],
	[500_000, 250_000, 15],
	[750_000, 250_000, 20],
	[1_000_000, 1_000_000, 25],
	[2_000_000, 3_000_000, 30],
	[5_000_000, 100_000_000, 35],
]

/** Salary less half (at most 100,000) and 60,000, less RMF and ThaiESG capped as in the 2026 rules. */
function thaiLevy(): Levy {
	const sums = BANDS.slice(1).map((_, index) => `sum${index}`)
	const measures: LevyMeasure[] = [
		{ id: "zero", op: "const", value: 0 },
		{ id: "income", op: "tally", label: "salary", basis: "gross" },
		{ id: "half", op: "scale", of: "income", num: 1, den: 2, rounding: "floor" },
		{ id: "expenseCap", op: "const", value: 10_000_000 },
		{ id: "deduction", op: "min", a: "half", b: "expenseCap" },
		{ id: "personal", op: "const", value: 6_000_000 },
		{ id: "rmfFunded", op: "tally", label: "rmf", basis: "funded" },
		{ id: "rmfShare", op: "scale", of: "income", num: 30, den: 100, rounding: "floor" },
		{ id: "rmfCeiling", op: "const", value: 50_000_000 },
		{ id: "rmfCap", op: "min", a: "rmfShare", b: "rmfCeiling" },
		{ id: "rmf", op: "min", a: "rmfFunded", b: "rmfCap" },
		{ id: "clusterCeiling", op: "const", value: 50_000_000 },
		{ id: "cluster", op: "min", a: "rmf", b: "clusterCeiling" },
		{ id: "esgFunded", op: "tally", label: "thaiesg", basis: "funded" },
		{ id: "esgCeiling", op: "const", value: 30_000_000 },
		{ id: "esgCap", op: "min", a: "rmfShare", b: "esgCeiling" },
		{ id: "esg", op: "min", a: "esgFunded", b: "esgCap" },
		{ id: "allowance", op: "add", a: "cluster", b: "esg" },
		{ id: "afterExpense", op: "sub", a: "income", b: "deduction" },
		{ id: "afterPersonal", op: "sub", a: "afterExpense", b: "personal" },
		{ id: "net", op: "sub", a: "afterPersonal", b: "allowance" },
		...BANDS.flatMap(([lo, width, percent], index) => band(index, lo, width, percent)),
		{ id: sums[0] ?? "", op: "add", a: "tax0", b: "tax1" },
		...sums
			.slice(1)
			.map(
				(id, index): LevyMeasure => ({ id, op: "add", a: sums[index] ?? "", b: `tax${index + 2}` }),
			),
	]
	return {
		id: "th-hand",
		period: { month: 1, day: 1 },
		settlement: { month: 3, day: 31 },
		measures,
		due: sums.at(-1) ?? "",
	}
}

const levy = thaiLevy()
const salary = reported(levy, { income: 120_000_000 })
/** One major unit (1 THB) is a grain of 100 satang. */
const step = { step: 5_000_000, grain: 100 }

describe("contributionSavings on a Thai-shaped Levy (satang, salary 1,200,000 THB, step 50,000 THB)", () => {
	it("fills RMF to 350,000 and ThaiESG to its 300,000 cap, each in whole steps", () => {
		// Net 1,040,000: 0 + 7,500 + 20,000 + 37,500 + 50,000 + 25% of 40,000 = 125,000 THB.
		// RMF steps save 12,000 + 4 x 10,000 + 9,500 + 7,500 = 69,000 over 7 steps; net 690,000 taxes to 56,000.
		// The 8th step (to 400,000, 10,000 of cap left) saves 1,500, but its last THB (399,999 to 400,000)
		// is past the 360,000 cap and saves nothing, so it is dropped: RMF stops at 350,000.
		// ThaiESG steps save 3 x 7,500 + 7,000 + 2 x 5,000 = 39,500 over 6 steps, ending exactly on its
		// 300,000 cap, where the last THB still saves, so all six stay: net 390,000 taxes to 7,500 + 9,000.
		const result = contributionSavings(levy, salary, optionsOf(["rmf", "thaiesg"], step))
		expect(result).toEqual({
			ok: true,
			dueBefore: 12_500_000,
			dueAfter: 1_650_000,
			labels: [
				{
					label: "rmf",
					plannedFunded: 0,
					extra: 35_000_000,
					saving: 6_900_000,
					stoppedBy: "noSaving",
				},
				{
					label: "thaiesg",
					plannedFunded: 0,
					extra: 30_000_000,
					saving: 3_950_000,
					stoppedBy: "noSaving",
				},
			],
		})
	})

	it("ends at the same due when ThaiESG goes first, with the same extras", () => {
		// ThaiESG first: 6 steps save 12,000 + 4 x 10,000 + 9,500 = 61,500 (net 740,000, due 63,500);
		// RMF then takes 7 steps to net 390,000 and drops the 8th, which only passes the cap.
		const result = contributionSavings(levy, salary, optionsOf(["thaiesg", "rmf"], step))
		expect(result.ok && [result.dueAfter, ...result.labels.map((item) => item.extra)]).toEqual([
			1_650_000, 30_000_000, 35_000_000,
		])
	})

	it("stops RMF at the 7th step with a 14% minimum saving, where the 8th would save 3% of a step", () => {
		const result = contributionSavings(
			levy,
			salary,
			optionsOf(["rmf"], { ...step, minSavingBps: 1400 }),
		)
		// Steps 1-7 save 12,000, 10,000 x4, 9,500, 7,500 THB: all at least 14% of 50,000 (7,000).
		expect(result.ok && result.labels[0]).toMatchObject({
			extra: 35_000_000,
			saving: 6_900_000,
			stoppedBy: "belowMinSaving",
		})
	})
})
