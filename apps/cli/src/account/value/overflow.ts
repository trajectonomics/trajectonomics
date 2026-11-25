import { laterOverflows as stretches } from "../../store"
import type { Batch } from "./batch"
import type { Refusal } from "./types"

/**
 * The entries whose write leaves a dated Balance of an account, its own or the one it posts
 * against, on the entry's date or later, outside the safe range once every write of the batch is
 * in, and worse than the Ledger left it (the store's rule, shared with `tx add`), each at the
 * entry's `value` field.
 */
export function laterOverflows(batch: Batch, path: (index: number) => string): Refusal[] {
	return stretches(batch.history, batch.steps.values(), (index) => path(index))
}
