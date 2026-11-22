import { describe, expect, it } from "bun:test"
import { calculateThTax } from "../calculate"
import type { ThTaxInput } from "../types"
import { toTaxInput } from "./invariants-input"
import { randomProfile } from "./invariants-profile"
import { type SeededRandom, seededRandom } from "./invariants-random"

const SEED = 52_003
const CASES = 60
/** Gate and 5,000 baht tests of the 0.5% method, sampled at 0.01 baht for the fully deductible sweep. */
const SWITCH_POINTS = [119_999.99, 120_000, 120_000.01, 999_999.99, 1_000_000, 1_000_000.01]
/**
 * Points 3 baht apart around each switch, for sweeps whose base carries standard 40(8) deductions.
 * The standard deductions floor to the satang, and the allowances stage subtracts in integer satang,
 * so the 3-baht sweep holds.
 */
const SWITCH_POINTS_3_BAHT = [119_997, 120_000, 120_003, 999_997, 1_000_000, 1_000_003]

/**
 * Builds a 40(8) general income sweep that reaches the minimum-tax branch.
 *
 * Purpose: Ordinary incomes are taxed far above 0.5%, so the minimum method rarely governs;
 * a fully deductible 40(8) general amount keeps progressive tax at zero and exposes the switch.
 * Math: Gross non-employment income `x`, actual expense `x * fraction`, so net income is `x * (1 - fraction)`.
 * Units: THB major units.
 */
function fullyDeductible(x: number, fraction: number): ThTaxInput {
	return {
		income: {
			section40_8: {
				general: { amount: x, expenseElection: "actual", actualExpense: x * fraction },
			},
		},
		allowances: { personal: 60_000 },
	}
}

function sweepPoints(rng: SeededRandom): readonly number[] {
	const seeded = Array.from({ length: 200 }, () => rng.int(0, 2_000_000 * 100) / 100)
	return [...seeded, ...SWITCH_POINTS].sort((a, b) => a - b)
}

describe("Thai PIT invariant: the minimum-tax switch never makes tax fall", () => {
	it("keeps total tax non-decreasing as non-employment income sweeps across 120,000 and 1,000,000", () => {
		const rng = seededRandom(SEED)
		let appliedPoints = 0
		for (let index = 0; index < CASES; index++) {
			const fraction = rng.pick([1, 0.9, 0.5])
			let previous = Number.NEGATIVE_INFINITY
			for (const x of sweepPoints(rng)) {
				const result = calculateThTax(fullyDeductible(x, fraction))
				if (result.breakdown.minimumGrossTax.wasApplied) appliedPoints++
				expect(result.totalTax).toBeGreaterThanOrEqual(previous)
				previous = result.totalTax
			}
		}
		// Guard against a vacuous pass: the sweep must actually reach the minimum-tax branch.
		expect(appliedPoints).toBeGreaterThan(0)
	})

	it("keeps total tax non-decreasing across the switch for seeded taxpayers, in 3-baht steps", () => {
		const rng = seededRandom(SEED + 1)
		for (let index = 0; index < CASES; index++) {
			const base = randomProfile(rng)
			let previous = Number.NEGATIVE_INFINITY
			for (const x of SWITCH_POINTS_3_BAHT) {
				const profile = { ...base, slots: { ...base.slots, general: { amount: x } } }
				const total = calculateThTax(toTaxInput(profile)).totalTax
				expect(total).toBeGreaterThanOrEqual(previous)
				previous = total
			}
		}
	})

	// Regression for seed 52004, case 0: before the satang floor, with the same base taxpayer, 40(8)
	// general at 119,999.99 baht gave tax 3,438,003.45 and at 120,000 baht gave 3,438,003.10. The
	// drop came from the standard 60% deduction being floored to whole baht (electable-expense.ts).
	// Tracked on trajectonomics/trajectonomics#52.
	it("tax never falls across the 120,000 gate for a 0.01-baht step (seed 52004, case 0)", () => {
		const base = randomProfile(seededRandom(SEED + 1))
		const taxAt = (x: number): number =>
			calculateThTax(toTaxInput({ ...base, slots: { ...base.slots, general: { amount: x } } }))
				.totalTax
		expect(taxAt(120_000)).toBeGreaterThanOrEqual(taxAt(119_999.99))
	})
})
