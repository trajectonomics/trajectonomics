import type { ThAllowancesInput } from "../types"
import type { SeededRandom } from "./invariants-random"

/**
 * One income category: a baht amount, optionally on the actual-expense election.
 * Units: THB major units, whole satang at most.
 */
export interface IncomeSlot {
	readonly amount: number
	readonly actualExpense?: number
}

/** Income categories that a generated profile fills, one slot per statutory category. */
export type IncomeSlotId =
	| "s1"
	| "s2"
	| "s3"
	| "s4"
	| "building"
	| "medical"
	| "s7"
	| "general"
	| "entertainer"

/** A plain-data taxpayer: every field is a number or a slot, so a failure prints cleanly. */
export interface InvariantProfile {
	readonly slots: Readonly<Record<IncomeSlotId, IncomeSlot>>
	readonly allowances: ThAllowancesInput
	readonly withholding: number
}

/** Slots that may carry the actual-expense election; 40(1), 40(2) and 40(4) never do. */
const ELECTABLE: ReadonlySet<IncomeSlotId> = new Set([
	"s3",
	"building",
	"medical",
	"s7",
	"general",
	"entertainer",
])

/** Allowance fields a profile may set, each with a statutory-scale maximum in baht. */
const ALLOWANCE_MAX: Readonly<Record<string, number>> = {
	socialSecurity: 10_500,
	lifeInsurance: 100_000,
	healthInsurance: 25_000,
	mortgageInterest: 100_000,
	rmf: 500_000,
	ssf: 200_000,
	donation2x: 200_000,
	donation1x: 200_000,
}

/** Largest generated amount per slot, in baht. */
export const MAX_SLOT_BAHT = 3_000_000

/**
 * Draws a baht amount with satang precision, sometimes exactly zero.
 *
 * Purpose: Keeps the generated amounts realistic: many are whole baht, some carry satang.
 * Math: An integer number of satang in [0, maxBaht * 100], divided by 100.
 * Units: THB major units with at most two decimals.
 */
export function bahtAmount(rng: SeededRandom, maxBaht: number): number {
	if (rng.bool(5)) return 0
	return rng.int(0, maxBaht * 100) / 100
}

function slotOf(rng: SeededRandom, id: IncomeSlotId): IncomeSlot {
	const amount = bahtAmount(rng, MAX_SLOT_BAHT)
	if (!ELECTABLE.has(id) || !rng.bool(2)) return { amount }
	return { amount, actualExpense: bahtAmount(rng, MAX_SLOT_BAHT) }
}

function allowancesOf(rng: SeededRandom): ThAllowancesInput {
	const values: Record<string, number> = { personal: 60_000 }
	for (const [field, max] of Object.entries(ALLOWANCE_MAX)) {
		if (rng.bool(3)) values[field] = bahtAmount(rng, max)
	}
	return values
}

/**
 * Draws one random taxpayer profile.
 *
 * Purpose: The shared input generator for the Thai invariant tests.
 * Math: Each income slot is an independent uniform draw; allowances and withholding are sparse.
 * Units: THB major units.
 *
 * @param rng Seeded generator from `seededRandom`.
 */
export function randomProfile(rng: SeededRandom): InvariantProfile {
	const ids: readonly IncomeSlotId[] = [
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
	const slots = Object.fromEntries(ids.map((id) => [id, slotOf(rng, id)])) as Record<
		IncomeSlotId,
		IncomeSlot
	>
	const withholding = rng.bool(2) ? bahtAmount(rng, 200_000) : 0
	return { slots, allowances: allowancesOf(rng), withholding }
}
