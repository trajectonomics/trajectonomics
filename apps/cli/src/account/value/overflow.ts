import { LedgerValidationError } from "@trajectonomics/core/ledger"
import { ledgerFailure } from "../../store"
import type { Batch } from "./batch"
import type { Refusal } from "./types"

/**
 * The entries whose write leaves a later dated Balance of an account, its own or the one it posts
 * against, outside the safe range once every write of the batch is in. Each account's writes cut
 * its later dates into stretches the batch holds one total over, and the history answers each
 * stretch from the reach it noted once, so an entry costs no scan of the Ledger. A refusal names the
 * account and the first date that overflows, at the entry that began the stretch.
 */
export function laterOverflows(batch: Batch, path: (index: number) => string): Refusal[] {
	const refused = new Map<number, Refusal>()
	for (const steps of batch.steps.values()) {
		steps.forEach((step, at) => {
			const next = steps[at + 1]
			if (next?.date === step.date || refused.has(step.index)) return
			const found = batch.history?.overflow(step.account.id, step.total, step.date, next?.date)
			if (found === undefined) return
			const error = new LedgerValidationError(
				"AMOUNT_OVERFLOW",
				`balance[${step.account.id}]`,
				found.sum.toString(),
				`a later Balance of "${step.account.name}" on ${found.date} exceeds the safe integer range`,
			)
			refused.set(step.index, { index: step.index, error: ledgerFailure(error, path(step.index)) })
		})
	}
	return [...refused.values()]
}
