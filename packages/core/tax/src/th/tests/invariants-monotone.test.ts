import { describe, expect, it } from "bun:test"
import { calculateThTax } from "../calculate"
import { raiseSlot, toTaxInput } from "./invariants-input"
import { type IncomeSlotId, type InvariantProfile, randomProfile } from "./invariants-profile"
import { forAllSeeded, type SeededRandom, seededRandom } from "./invariants-random"

const SEED = 52_001
const CASES = 250
/**
 * Smallest income increase the monotonicity property asserts, in baht.
 *
 * Percentage deductions floor to the satang (owner ruling 2026-11-22, trajectonomics/trajectonomics#52),
 * so a step of 3 baht or more holds in 40,000 seeded draws. Sub-3-baht steps hold in 40,000 draws too
 * (checked outside the suite), and the allowances stage subtracts in integer satang (see the test below).
 */
const MIN_STEP_BAHT = 3
const SLOT_IDS: readonly IncomeSlotId[] = [
	"s1",
	"s2",
	"s3",
	"s4",
	"building",
	"medical",
	"s7",
	"general",
	"entertainer",
]

interface MonotoneCase {
	readonly profile: InvariantProfile
	readonly slot: IncomeSlotId
	readonly delta: number
}

function monotoneCase(rng: SeededRandom, minStepBaht: number): MonotoneCase {
	return {
		profile: randomProfile(rng),
		slot: rng.pick(SLOT_IDS),
		delta: rng.int(minStepBaht * 100, 3_000_000 * 100) / 100,
	}
}

function totalTax(profile: InvariantProfile): number {
	return calculateThTax(toTaxInput(profile)).totalTax
}

describe("Thai PIT invariant: more income of one class never lowers tax", () => {
	it(`keeps total tax non-decreasing when any one income class rises by at least ${MIN_STEP_BAHT} baht`, () => {
		forAllSeeded(
			"income monotonicity",
			SEED,
			CASES,
			(rng) => monotoneCase(rng, MIN_STEP_BAHT),
			({ profile, slot, delta }) => {
				expect(totalTax(raiseSlot(profile, slot, delta))).toBeGreaterThanOrEqual(totalTax(profile))
			},
		)
	})

	it("holds for each class in isolation from a zero-income taxpayer", () => {
		// A zero-income starting point isolates the marginal effect of one class at a time.
		const zeroSlots = Object.fromEntries(SLOT_IDS.map((id) => [id, { amount: 0 }])) as Record<
			IncomeSlotId,
			{ readonly amount: number }
		>
		const zero: InvariantProfile = { slots: zeroSlots, allowances: {}, withholding: 0 }
		for (const id of SLOT_IDS) {
			expect(totalTax(raiseSlot(zero, id, 1_000_000))).toBeGreaterThanOrEqual(
				totalTax(raiseSlot(zero, id, 100_000)),
			)
		}
	})

	// Regression for seed 1, case 18: before the satang floor, raising 40(8) general income by 0.84
	// baht lowered total tax from 2,263,556.60 to 2,263,556.55, because the standard 60% deduction was
	// floored to whole baht (electable-expense.ts). Tracked on trajectonomics/trajectonomics#52.
	it("tax never falls for a sub-3-baht increase (seed 1, case 18)", () => {
		forAllSeeded(
			"income monotonicity, sub-3-baht steps",
			1,
			19,
			(rng) => ({
				profile: randomProfile(rng),
				slot: rng.pick(SLOT_IDS),
				delta: rng.int(1, 299) / 100,
			}),
			({ profile, slot, delta }) => {
				expect(totalTax(raiseSlot(profile, slot, delta))).toBeGreaterThanOrEqual(totalTax(profile))
			},
		)
	})

	// Seed 52004, profile 403, with 40(8) general at 11,993.04 then 11,993.05 baht: a float subtraction
	// before the donation cap once made total tax fall by a satang. The allowances stage now subtracts
	// in integer satang (#52).
	it("never falls by a satang from float subtraction before the donation floor (seed 52004, profile 403)", () => {
		const rng = seededRandom(52_004)
		let base = randomProfile(rng)
		for (let index = 0; index < 403; index++) base = randomProfile(rng)
		const taxAt = (x: number): number =>
			calculateThTax(toTaxInput({ ...base, slots: { ...base.slots, general: { amount: x } } }))
				.totalTax
		expect(taxAt(11_993.05)).toBeGreaterThanOrEqual(taxAt(11_993.04))
	})
})
