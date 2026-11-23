import { describe, expect, it } from "bun:test"
import type { Levy, SavingsOptions } from "../types"
import { contributionSavings } from "./savings"
import { INCOME, optionsOf, periodOf, reported, STEP, taxLevy } from "./test-savings"

const levy = taxLevy([["a", 500_000]])
const period = reported(levy, { income: INCOME })

describe("contributionSavings refusals", () => {
	it("refuses a label no funded tally reads, at its index", () => {
		const result = contributionSavings(levy, period, optionsOf(["a", "salary"]))
		expect(result).toEqual({
			ok: false,
			problem: { code: "UNKNOWN_FUNDED_LABEL", path: ["labels", 1] },
		})
	})

	it("refuses a label named twice", () => {
		const result = contributionSavings(levy, period, optionsOf(["a", "a"]))
		expect(result).toEqual({ ok: false, problem: { code: "INVALID_OPTION", path: ["labels", 1] } })
	})

	it.each([
		["step", { step: 0 }],
		["step", { step: 1.5 }],
		["maxSteps", { maxSteps: 0 }],
		["budget", { budget: -1 }],
		["minSavingBps", { minSavingBps: Number.NaN }],
		["minSavingBps", { minSavingBps: 10_001 }],
		["grain", { grain: 0 }],
		["grain", { grain: -1 }],
		["grain", { grain: 0.5 }],
		["grain", { grain: STEP }],
		["grain", { grain: STEP + 1 }],
		["inflation", { inflation: Number.POSITIVE_INFINITY }],
	])("refuses an out-of-range %s", (key, more) => {
		const result = contributionSavings(levy, period, optionsOf(["a"], more))
		expect(result).toEqual({ ok: false, problem: { code: "INVALID_OPTION", path: [key] } })
	})

	it("refuses a missing grain", () => {
		const { grain: _grain, ...without } = optionsOf(["a"])
		const result = contributionSavings(levy, period, without as unknown as SavingsOptions)
		expect(result).toEqual({ ok: false, problem: { code: "INVALID_OPTION", path: ["grain"] } })
	})

	it("accepts the bounds: minSavingBps 10,000 and a grain one less than the step", () => {
		const edge = optionsOf(["a"], { minSavingBps: 10_000, grain: STEP - 1 })
		expect(contributionSavings(levy, period, edge)).toMatchObject({ ok: true })
	})

	it("refuses a period whose due is not this Levy's due at the Due date, at the period's due", () => {
		// The hand Levy owes 160,000 on 1,000,000 of income; a period reporting 150,000 is another Levy's.
		const other = periodOf({ income: INCOME }, 150_000)
		expect(contributionSavings(levy, other, optionsOf(["a"]))).toEqual({
			ok: false,
			problem: { code: "PERIOD_DUE_MISMATCH", path: ["period", "due"] },
		})
	})

	it("refuses rather than run past maxSteps, naming the key", () => {
		const result = contributionSavings(levy, period, optionsOf(["a"], { maxSteps: 4 }))
		expect(result).toEqual({ ok: false, problem: { code: "TOO_MANY_STEPS", path: ["maxSteps"] } })
		const fits = contributionSavings(levy, period, optionsOf(["a"], { maxSteps: 5 }))
		expect(fits).toMatchObject({ ok: true })
	})

	it("answers with maxSteps 2 when the third step tried is dropped, and refuses with 1", () => {
		// Cap 250,000, step 100,000: two steps are taken and the third goes past the cap and is dropped.
		const capped = taxLevy([["a", 250_000]])
		const reports = reported(capped, { income: INCOME })
		const fits = contributionSavings(capped, reports, optionsOf(["a"], { maxSteps: 2 }))
		expect(fits).toMatchObject({ ok: true, dueAfter: 120_000 })
		expect(fits.ok && fits.labels[0]).toMatchObject({ extra: 200_000, stoppedBy: "noSaving" })
		const refused = contributionSavings(capped, reports, optionsOf(["a"], { maxSteps: 1 }))
		expect(refused).toEqual({ ok: false, problem: { code: "TOO_MANY_STEPS", path: ["maxSteps"] } })
	})

	it("returns an unsafe reported tally as NOT_SAFE_INTEGER, as evaluateMeasures does", () => {
		const unsafe = periodOf({ income: INCOME, aFunded: 2 ** 53 }, 160_000)
		expect(contributionSavings(levy, unsafe, optionsOf(["a"]))).toEqual({
			ok: false,
			problem: { code: "NOT_SAFE_INTEGER", path: ["funded", "a"] },
		})
	})

	it("returns a step that leaves the safe range as NOT_SAFE_INTEGER", () => {
		const edge = periodOf({ income: INCOME, aFunded: Number.MAX_SAFE_INTEGER - 5 }, 60_000)
		const result = contributionSavings(levy, edge, optionsOf(["a"]))
		expect(result).toEqual({
			ok: false,
			problem: { code: "NOT_SAFE_INTEGER", path: ["funded", "a"] },
		})
	})

	it("returns a Measure that overflows as VALUE_OVERFLOW at the Due date", () => {
		const big: Levy = {
			...levy,
			measures: [
				...levy.measures,
				{ id: "huge", op: "scale", of: "income", num: 2 ** 40, den: 1, rounding: "floor" },
			],
			due: "huge",
		}
		const result = contributionSavings(big, reported(levy, { income: INCOME }), optionsOf(["a"]))
		expect(result).toEqual({ ok: false, problem: { code: "VALUE_OVERFLOW", date: "2027-03-31" } })
	})
})

describe("contributionSavings context", () => {
	it("reads a growing const at the Due date with the stated inflation", () => {
		const grown: Levy = {
			id: "grown",
			period: { month: 1, day: 1 },
			settlement: { month: 3, day: 31 },
			measures: [
				{ id: "base", op: "const", value: 100, asOf: "2025-01-01", growth: "inflation" },
				{ id: "funded", op: "tally", label: "a", basis: "funded" },
				{ id: "due", op: "sub", a: "base", b: "funded" },
			],
			due: "due",
		}
		// 100 grown by 10% a year for the whole years from 2025-01-01 to the 2027-03-31 Due date: 121.
		const result = contributionSavings(grown, periodOf({ funded: 0 }, 121), {
			...optionsOf(["a"], { step: 10, grain: 1, budget: 25 }),
			inflation: 1000,
		})
		expect(result).toMatchObject({ ok: true, dueBefore: 121, dueAfter: 101 })
		// A wrong inflation reads the constant as 100, not the 121 the period reported: refused.
		const wrong = { ...optionsOf(["a"], { step: 10, grain: 1 }), inflation: 0 }
		expect(contributionSavings(grown, periodOf({ funded: 0 }, 121), wrong)).toEqual({
			ok: false,
			problem: { code: "PERIOD_DUE_MISMATCH", path: ["period", "due"] },
		})
		expect(result.ok && result.labels[0]).toMatchObject({ extra: 20, stoppedBy: "budget" })
	})
})
