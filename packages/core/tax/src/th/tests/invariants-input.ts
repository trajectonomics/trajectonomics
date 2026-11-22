import type { ThExpenseElectableIncome, ThTaxInput } from "../types"
import type { IncomeSlot, IncomeSlotId, InvariantProfile } from "./invariants-profile"

function electable(slot: IncomeSlot): number | ThExpenseElectableIncome {
	if (slot.actualExpense === undefined) return slot.amount
	return {
		amount: slot.amount,
		expenseElection: "actual",
		actualExpense: slot.actualExpense,
	}
}

/**
 * Converts a profile into the public `ThTaxInput` the pipeline accepts.
 *
 * Purpose: The only place a profile becomes engine input, so every test builds inputs the same way.
 * Math: Direct field mapping; no computation.
 * Units: THB major units.
 *
 * @param profile Plain-data taxpayer from `randomProfile` or a test.
 */
export function toTaxInput(profile: InvariantProfile): ThTaxInput {
	const s = profile.slots
	return {
		filingStatus: "single",
		income: {
			section40_1: s.s1.amount,
			section40_2: s.s2.amount,
			section40_3: electable(s.s3),
			section40_4: s.s4.amount,
			section40_5: { building: electable(s.building) },
			section40_6: { medical: electable(s.medical) },
			section40_7: electable(s.s7),
			section40_8: { general: electable(s.general), entertainer: electable(s.entertainer) },
		},
		allowances: profile.allowances,
		withholdingTax: profile.withholding,
	}
}

/**
 * Returns a copy of the profile with one income slot raised by `delta` baht.
 *
 * Purpose: Builds the "more income of one class" case for the monotonicity invariant.
 * Math: `amount + delta`; the actual-expense figure is left unchanged.
 * Units: THB major units.
 *
 * @param profile Starting taxpayer.
 * @param id Income slot to raise.
 * @param delta Non-negative increase in baht.
 */
export function raiseSlot(
	profile: InvariantProfile,
	id: IncomeSlotId,
	delta: number,
): InvariantProfile {
	const slot = profile.slots[id]
	const raised: IncomeSlot = { ...slot, amount: slot.amount + delta }
	return { ...profile, slots: { ...profile.slots, [id]: raised } }
}
