import { describe, expect, it } from "bun:test"
import type { Levy } from "../types"
import { contributionSavings } from "./savings"
import { INCOME, optionsOf, periodOf, taxLevy } from "./test-savings"

const levy = taxLevy([["a", 500_000]])
const period = periodOf({ income: INCOME })

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
		["inflation", { inflation: Number.POSITIVE_INFINITY }],
	])("refuses an out-of-range %s", (key, more) => {
		const result = contributionSavings(levy, period, optionsOf(["a"], more))
		expect(result).toEqual({ ok: false, problem: { code: "INVALID_OPTION", path: [key] } })
	})

	it("refuses rather than run past maxSteps, naming the key", () => {
		const result = contributionSavings(levy, period, optionsOf(["a"], { maxSteps: 4 }))
		expect(result).toEqual({ ok: false, problem: { code: "TOO_MANY_STEPS", path: ["maxSteps"] } })
		const fits = contributionSavings(levy, period, optionsOf(["a"], { maxSteps: 5 }))
		expect(fits).toMatchObject({ ok: true })
	})

	it("returns an unsafe reported tally as NOT_SAFE_INTEGER, as evaluateMeasures does", () => {
		const unsafe = periodOf({ income: INCOME, aFunded: 2 ** 53 })
		expect(contributionSavings(levy, unsafe, optionsOf(["a"]))).toEqual({
			ok: false,
			problem: { code: "NOT_SAFE_INTEGER", path: ["funded", "a"] },
		})
	})

	it("returns a step that leaves the safe range as NOT_SAFE_INTEGER", () => {
		const edge = periodOf({ income: INCOME, aFunded: Number.MAX_SAFE_INTEGER - 5 })
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
		const result = contributionSavings(big, period, optionsOf(["a"]))
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
		const result = contributionSavings(grown, periodOf({ funded: 0 }), {
			...optionsOf(["a"], { step: 10, budget: 25 }),
			inflation: 1000,
		})
		expect(result).toMatchObject({ ok: true, dueBefore: 121, dueAfter: 101 })
		expect(result.ok && result.labels[0]).toMatchObject({ extra: 20, stoppedBy: "budget" })
	})
})
