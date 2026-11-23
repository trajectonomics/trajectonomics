import { describe, expect, it } from "bun:test"
import type { SavingsOptions, SavingsResult } from "../types"
import { contributionSavings } from "./savings"
import { INCOME, optionsOf, reported, STEP, taxLevy } from "./test-savings"

const SALARY = { income: INCOME }

function run(
	caps: readonly (readonly [string, number])[],
	options: SavingsOptions,
	shared?: number,
	planned: Readonly<Record<string, number>> = {},
): Extract<SavingsResult, { ok: true }> {
	const levy = taxLevy(caps, shared)
	const result = contributionSavings(levy, reported(levy, { ...SALARY, ...planned }), options)
	if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.problem)}`)
	const sum = result.labels.reduce((total, item) => total + item.saving, 0)
	expect(result.dueBefore - result.dueAfter).toBe(sum)
	return result
}

describe("contributionSavings", () => {
	it("stops a capped label with noSaving once the cap is used, in whole steps", () => {
		// Net 1,000,000 → 400,000: 10% of 400,000 + 20% of 600,000 = 160,000 falls by 20,000 a step.
		const result = run([["rmf", 300_000]], optionsOf(["rmf"]))
		expect(result.dueBefore).toBe(160_000)
		expect(result.labels).toEqual([
			{ label: "rmf", plannedFunded: 0, extra: 300_000, saving: 60_000, stoppedBy: "noSaving" },
		])
		expect(result.dueAfter).toBe(100_000)
	})

	it("starts from what the period already funded", () => {
		const result = run([["rmf", 300_000]], optionsOf(["rmf"]), undefined, { rmfFunded: 100_000 })
		expect(result.dueBefore).toBe(140_000)
		expect(result.labels[0]).toMatchObject({
			plannedFunded: 100_000,
			extra: 200_000,
			saving: 40_000,
		})
	})

	it("fills two labels that share a cap in the given order, and the second stops early", () => {
		const caps = [
			["a", 200_000],
			["b", 500_000],
		] as const
		const forward = run(caps, optionsOf(["a", "b"]), 300_000)
		expect(forward.labels.map((item) => [item.extra, item.saving])).toEqual([
			[200_000, 40_000],
			[100_000, 20_000],
		])
		const reverse = run(caps, optionsOf(["b", "a"]), 300_000)
		expect(reverse.labels.map((item) => [item.extra, item.stoppedBy])).toEqual([
			[300_000, "noSaving"],
			[0, "noSaving"],
		])
		expect(reverse.dueAfter).toBe(forward.dueAfter)
	})

	it("stops mid-label when the budget does not cover the next step", () => {
		const result = run(
			[
				["a", 500_000],
				["b", 500_000],
			],
			optionsOf(["a", "b"], { budget: 250_000 }),
		)
		expect(result.labels.map((item) => [item.extra, item.stoppedBy])).toEqual([
			[200_000, "budget"],
			[0, "budget"],
		])
	})

	it("stops where the marginal bracket falls below minSavingBps", () => {
		// 600,000 of allowance reaches the 400,000 threshold; after it a step saves 10,000.
		const caps = [["a", 800_000]] as const
		expect(run(caps, optionsOf(["a"], { minSavingBps: 1500 })).labels[0]).toMatchObject({
			extra: 600_000,
			saving: 120_000,
			stoppedBy: "belowMinSaving",
		})
		expect(run(caps, optionsOf(["a"], { minSavingBps: 2000 })).labels[0]?.extra).toBe(600_000)
		expect(run(caps, optionsOf(["a"], { minSavingBps: 1000 })).labels[0]?.extra).toBe(800_000)
	})

	it("drops the step that goes past the cap, since its last grain saved nothing", () => {
		// Cap 250,000, step 100,000: the third step (to 300,000) lets 50,000 of room pay, 10,000 in tax.
		// Its last 1,000 (299,000 to 300,000) is past the cap and saves nothing, so the step is dropped.
		const result = run([["a", 250_000]], optionsOf(["a"]))
		expect(result.labels[0]).toEqual({
			label: "a",
			plannedFunded: 0,
			extra: 200_000,
			saving: 40_000,
			stoppedBy: "noSaving",
		})
		expect(result.dueAfter).toBe(120_000)
	})

	it("keeps a step whose last grain still saves: it ends exactly on the cap, or within a grain of it", () => {
		// Cap 300,000 is reached exactly: 299,000 still pays 200 on the last grain.
		expect(run([["a", 300_000]], optionsOf(["a"])).labels[0]).toMatchObject({
			extra: 300_000,
			saving: 60_000,
		})
		// Cap 299_500: the last grain pays for its first 500 only, so the step stays: 299,500 x 20% = 59,900.
		expect(run([["a", 299_500]], optionsOf(["a"])).labels[0]).toMatchObject({
			extra: 300_000,
			saving: 59_900,
		})
	})

	it("starts the next label from the tallies and due that the dropped step left", () => {
		// a: cap 250,000 stops at 200,000 and leaves due 120,000 (the dropped step's 10,000 is not counted).
		// b then starts from net 800,000: three steps of 20,000 against its 300,000 cap, 120,000 to 60,000.
		const caps = [
			["a", 250_000],
			["b", 300_000],
		] as const
		const result = run(caps, optionsOf(["a", "b"]), undefined, {})
		expect(result.labels.map((item) => [item.extra, item.saving])).toEqual([
			[200_000, 40_000],
			[300_000, 60_000],
		])
		expect(result.dueAfter).toBe(60_000)
	})

	it("gives the dropped step back to the budget and to maxSteps", () => {
		// Budget 450,000: a takes 200,000 after the drop, leaving 250,000 for b, which takes 200,000.
		const caps = [
			["a", 250_000],
			["b", 500_000],
		] as const
		const result = run(caps, optionsOf(["a", "b"], { budget: 450_000 }))
		expect(result.labels.map((item) => [item.extra, item.stoppedBy])).toEqual([
			[200_000, "noSaving"],
			[200_000, "budget"],
		])
		// Four steps in all fit maxSteps 4 once the dropped step is not counted (it would be 5 counting the dropped one).
		expect(
			contributionSavings(
				taxLevy(caps),
				reported(taxLevy(caps), SALARY),
				optionsOf(["a", "b"], { budget: 450_000, maxSteps: 4 }),
			),
		).toMatchObject({ ok: true })
	})

	it("takes no step on a Levy whose due rises with a tally", () => {
		const rising = taxLevy([["a", 500_000]])
		const dearer = {
			...rising,
			measures: [...rising.measures, { id: "dearer", op: "add" as const, a: "due", b: "aFunded" }],
			due: "dearer",
		}
		const result = contributionSavings(dearer, reported(dearer, SALARY), optionsOf(["a"]))
		expect(result).toMatchObject({ ok: true, dueBefore: 160_000, dueAfter: 160_000 })
		expect(result.ok && result.labels).toEqual([
			{ label: "a", plannedFunded: 0, extra: 0, saving: 0, stoppedBy: "noSaving" },
		])
	})

	it("returns no labels for an empty list, and leaves due alone", () => {
		expect(run([["a", STEP]], optionsOf([]))).toMatchObject({
			dueBefore: 160_000,
			dueAfter: 160_000,
			labels: [],
		})
	})
})
