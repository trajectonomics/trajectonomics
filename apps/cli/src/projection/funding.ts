import type { AccountAmount } from "@trajectonomics/core/sim"
import { CONTRIBUTION_CAP } from "../scenario/shape/terms"
import { moneyOf } from "./money"

/** The total a Projection could not invest, in minor units; `null` when the sum is not exact. */
function unfundedTotal(unfunded: readonly AccountAmount[]): number | null {
	let total = 0n
	for (const item of unfunded) total += BigInt(item.amount)
	const limit = BigInt(Number.MAX_SAFE_INTEGER)
	if (total > limit || total < -limit) return null
	return Number(total)
}

/** Why a Contribution goes unfunded, and what to write instead (the schema says the same). */
const WHY = `${CONTRIBUTION_CAP[0]?.toUpperCase()}${CONTRIBUTION_CAP.slice(1)}: use a monthly Flow.`

/**
 * The sentence a Projection with Contributions it could not fund adds to its notes. A Contribution
 * larger than the cash available is not made, so a what-if that looks identical to its base says
 * why rather than leaving the reader to find `unfundedContributions` in a row (cli#150).
 */
export function fundingNotes(
	unfunded: readonly AccountAmount[],
	currency: string,
	side?: "A" | "B",
): string[] {
	const total = unfundedTotal(unfunded)
	if (total === null || total === 0) return []
	const amount = moneyOf(currency)(total)
	if (side === undefined) {
		return [`${amount} of Contributions could not be funded, so they were not made. ${WHY}`]
	}
	return [`Side ${side} could not fund ${amount} of Contributions, so they were not made. ${WHY}`]
}
