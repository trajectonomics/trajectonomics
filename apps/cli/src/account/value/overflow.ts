import { LedgerValidationError } from "@trajectonomics/core/ledger"
import { ledgerFailure } from "../../store"
import type { Batch, Step } from "./batch"
import type { Refusal } from "./types"

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
	const found = batch.history?.overflow(step.account.id, step.total, step.date, next?.date, true)
	if (found === undefined) return undefined
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
 * overflows, at the entry that began the stretch. An overflow the Ledger already holds on a date, at
 * least as large as the one the write leaves there, is not the entry's, so the dates it is judged on
 * are each compared with the Ledger's own Balance that day, not only the first.
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
