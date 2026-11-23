/** TEST-ONLY hand-written Levies and periods for `contributionSavings`; not imported by `src/index.ts`. */
import type { Levy, LevyMeasure, SavingsOptions, SettlementPeriod } from "../types"

export const INCOME = 1_000_000
export const THRESHOLD = 400_000

/** Net income is taxed at 10% up to 400,000 and 20% above, after the allowances below. */
const TAX: readonly LevyMeasure[] = [
	{ id: "zero", op: "const", value: 0 },
	{ id: "income", op: "tally", label: "salary", basis: "gross" },
	{ id: "net", op: "sub", a: "income", b: "allowance" },
	// biome-ignore lint/suspicious/noThenProperty: `then` is a PickMeasure operand key
	{ id: "taxable", op: "pick", a: "net", b: "zero", then: "net", else: "zero" },
	{ id: "threshold", op: "const", value: THRESHOLD },
	{ id: "low", op: "min", a: "taxable", b: "threshold" },
	{ id: "high", op: "sub", a: "taxable", b: "low" },
	{ id: "lowTax", op: "scale", of: "low", num: 10, den: 100, rounding: "floor" },
	{ id: "highTax", op: "scale", of: "high", num: 20, den: 100, rounding: "floor" },
	{ id: "due", op: "add", a: "lowTax", b: "highTax" },
]

/** `[label, cap]` pairs: each label's allowance is `min(funded, cap)`; `shared` caps all of them together. */
export function taxLevy(caps: readonly (readonly [string, number])[], shared?: number): Levy {
	const measures: LevyMeasure[] = [...TAX]
	const parts: string[] = []
	for (const [label, cap] of caps) {
		measures.push(
			{ id: `${label}Funded`, op: "tally", label, basis: "funded" },
			{ id: `${label}Cap`, op: "const", value: cap },
			{ id: `${label}Part`, op: "min", a: `${label}Funded`, b: `${label}Cap` },
		)
		parts.push(`${label}Part`)
	}
	let sum = "zero"
	for (const part of parts) {
		measures.push({ id: `sum${part}`, op: "add", a: sum, b: part })
		sum = `sum${part}`
	}
	measures.push({ id: "sharedCap", op: "const", value: shared ?? Number.MAX_SAFE_INTEGER })
	measures.push({ id: "allowance", op: "min", a: sum, b: "sharedCap" })
	return {
		id: "hand",
		period: { month: 1, day: 1 },
		settlement: { month: 3, day: 31 },
		measures,
		due: "due",
	}
}

/** A 2026 Settlement period reporting these `tally` Measure values by id. */
export function periodOf(values: Readonly<Record<string, number>>): SettlementPeriod {
	return {
		from: "2026-01-01",
		to: "2026-12-31",
		settlementDate: "2027-03-31",
		measures: Object.entries(values).map(([id, value]) => ({ id, value })),
		prepaid: 0,
		due: 0,
		settlement: 0,
		settled: false,
		partial: false,
	}
}

export const STEP = 100_000

export function optionsOf(
	labels: readonly string[],
	more: Partial<SavingsOptions> = {},
): SavingsOptions {
	return { labels, step: STEP, inflation: 0, maxSteps: 100, ...more }
}
