import { LedgerValidationError } from "@trajectonomics/core/ledger"
import { ledgerFailure } from "../../store"
import type { Batch, Step } from "./batch"
import type { Refusal } from "./types"

const magnitude = (sum: bigint): bigint => (sum < 0n ? -sum : sum)

/** The refusal of the entry whose write begins stretch `at` of an account's writes, if it earns one. */
function refusalOf(
	batch: Batch,
	steps: readonly Step[],
	at: number,
	path: (index: number) => string,
): Refusal | undefined {
	const step = steps[at]!
	const next = steps[at + 1]
	if (next?.date === step.date) return undefined
	const found = batch.history?.overflow(step.account.id, step.total, step.date, next?.date)
	if (found === undefined) return undefined
	const held = batch.history?.overflow(step.account.id, 0n, step.date, next?.date)
	if (held?.date === found.date && magnitude(found.sum) <= magnitude(held.sum)) return undefined
	const which = found.date > step.date ? "a later Balance" : "the Balance"
	const error = new LedgerValidationError(
		"AMOUNT_OVERFLOW",
		`balance[${step.account.id}]`,
		found.sum.toString(),
		`${which} of "${step.account.name}" on ${found.date} exceeds the safe integer range`,
	)
	return { index: step.index, error: ledgerFailure(error, path(step.index)) }
}

/**
 * The entries whose write leaves a dated Balance of an account, its own or the one it posts
 * against, on the entry's date or later, outside the safe range once every write of the batch is
 * in, and worse than the Ledger left it. Each account's writes cut its dates into stretches the
 * batch holds one total over, and the history answers each stretch from the reach it noted once,
 * so an entry costs no scan of the Ledger. A refusal names the account and the first date that
 * overflows, at the entry that began the stretch. An overflow the Ledger already holds on that date,
 * at least as large, is not the entry's: it is left as it was, as it was before the batch.
 */
export function laterOverflows(batch: Batch, path: (index: number) => string): Refusal[] {
	const refused = new Map<number, Refusal>()
	for (const steps of batch.steps.values()) {
		for (let at = 0; at < steps.length; at++) {
			const index = steps[at]!.index
			if (refused.has(index)) continue
			const refusal = refusalOf(batch, steps, at, path)
			if (refusal !== undefined) refused.set(index, refusal)
		}
	}
	return [...refused.values()]
}
