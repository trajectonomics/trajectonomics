import { describe, expect, it } from "bun:test"
import { contributionSavings } from "../levy/savings"
import { INCOME, periodOf, taxLevy } from "../levy/test-savings"
import type { SavingsOptions } from "../types"
import { type OracleSavingsInput, oracleSavings } from "./oracle-savings"

const CAPS = [100_000, 250_000, 600_000, 900_000] as const
const STEPS = [50_000, 100_000, 150_000] as const
const BUDGETS = [undefined, 0, 200_000, 450_000] as const
const MINIMUMS = [0, 1000, 1500, 2000, 9999] as const

interface Case {
	readonly first: number
	readonly second: number
	readonly step: number
	readonly budget: number | undefined
	readonly minSavingBps: number
}

const cases: readonly Case[] = CAPS.flatMap((first) =>
	CAPS.flatMap((second) =>
		STEPS.flatMap((step) =>
			BUDGETS.flatMap((budget) =>
				MINIMUMS.map((minSavingBps) => ({ first, second, step, budget, minSavingBps })),
			),
		),
	),
)

const GROSS = new Map([["salary", BigInt(INCOME)]])
const WHEN = { date: "2027-03-31", periodEnd: "2026-12-31", inflation: 0, reach: 40 } as const

function oracleInput(
	levy: OracleSavingsInput["levy"],
	options: SavingsOptions,
): OracleSavingsInput {
	return {
		...WHEN,
		levy,
		tallies: { gross: GROSS, funded: new Map([["a", 50_000n]]) },
		labels: options.labels,
		step: BigInt(options.step),
		budget: options.budget === undefined ? undefined : BigInt(options.budget),
		minSavingBps: BigInt(options.minSavingBps ?? 0),
	}
}

function agree({ first, second, step, budget, minSavingBps }: Case): void {
	const levy = taxLevy(
		[
			["a", first],
			["b", second],
		],
		700_000,
	)
	const options: SavingsOptions = {
		labels: ["b", "a"],
		step,
		inflation: 0,
		maxSteps: 100,
		...(budget === undefined ? {} : { budget }),
		minSavingBps,
	}
	const scan = contributionSavings(levy, periodOf({ income: INCOME, aFunded: 50_000 }), options)
	if (!scan.ok) throw new Error(`refused: ${JSON.stringify(scan.problem)}`)
	const got = scan.labels.map((item) => [
		item.label,
		item.extra / step,
		item.saving,
		item.stoppedBy,
	])
	const want = oracleSavings(oracleInput(levy, options)).map((item) => [
		item.label,
		item.steps,
		Number(item.saving),
		item.stoppedBy,
	])
	expect(got).toEqual(want)
}

describe("contributionSavings against the brute-force oracle", () => {
	it(`agrees on ${cases.length} cases of two labels, a shared cap, a budget and a minimum`, () => {
		for (const item of cases) agree(item)
	})

	it("counts a hand case: cap 250,000 and step 100,000 take 3 steps, saving 20,000 + 20,000 + 10,000", () => {
		const input = oracleInput(taxLevy([["a", 250_000]]), {
			labels: ["a"],
			step: 100_000,
			inflation: 0,
			maxSteps: 9,
		})
		const [only] = oracleSavings({ ...input, tallies: { gross: GROSS, funded: new Map() } })
		expect(only).toEqual({ label: "a", steps: 3, saving: 50_000n, stoppedBy: "noSaving" })
	})
})
