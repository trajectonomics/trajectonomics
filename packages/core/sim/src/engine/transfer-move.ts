import type { DateString } from "../types"
import type { ProjectionProblem } from "../types/projection"
import { basisTaken } from "./levy-gains"
import type { LevySet } from "./levy-set"
import { mutate } from "./mutate"
import type { AccountState } from "./state"
import { valuation } from "./value"

/**
 * The Cost basis the source gave up: with `realise` the sale's own booking took it, and its gain is
 * tallied; without, the share of the pooled basis the money is of the value, with no gain. Nothing is
 * tracked without a Levy, as for a sale.
 */
function basisLeaving(
	from: AccountState,
	before: bigint | undefined,
	moved: { readonly amount: bigint; readonly value: bigint },
	levies: LevySet | undefined,
	realise: boolean,
): bigint | undefined {
	if (levies === undefined || from.basis === undefined || before === undefined) return undefined
	if (realise) return before - from.basis
	const taken = basisTaken(before, moved.amount, moved.value)
	from.basis = before - taken
	return taken
}

/**
 * Moves `amount` out of `from` and into `to`, which the caller has already limited to what both can
 * take. Money into a liability pays it down. An untaxed move carries the average Cost basis with the
 * money into a gain-tracked target; a realised one books a sale out and a purchase in (ADR 0031).
 */
export function moveMoney(
	from: AccountState,
	to: AccountState,
	amount: bigint,
	date: DateString,
	levies: LevySet | undefined,
	realise: boolean,
): ProjectionProblem | undefined {
	const distribution = realise ? undefined : "transfer"
	const before = from.basis
	const value = valuation(from, date)
	const out = mutate(from, date, -amount, levies, distribution)
	if (out !== undefined) return out
	const taken = basisLeaving(from, before, { amount, value }, levies, realise)
	if (to.rule.kind === "liability") return mutate(to, date, -amount, levies)
	const into = mutate(to, date, amount, levies, distribution)
	if (into === undefined && !realise && levies !== undefined && to.basis !== undefined) {
		to.basis += taken ?? amount
	}
	return into
}
