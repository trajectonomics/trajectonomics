import { LedgerValidationError } from "@trajectonomics/core/ledger"
import { type AppError, isAppError } from "../../errors"
import {
	type AccountRow,
	type Ledger,
	ledgerFailure,
	type NewTransaction,
	type Planned,
	type TxPlanner,
} from "../../store"
import { applyEntry } from "./apply"
import { type Batch, startBatch } from "./batch"
import { type StoredValuation, storedValuations } from "./later"
import { againstOf, inApplyOrder, prepareAll } from "./prepare"
import { rejection } from "./rejection"
import type { Prepared, Refusal, Valuation, ValuedRow, ValueRequest } from "./types"

export type { Valuation, ValuedRow, ValueRequest } from "./types"

type Run = { batch: Batch; valued: ValuedRow[]; failed: Refusal[] }

/** Applies the entries in order; the core's refusal of one is listed at its own field. */
function applyAll(
	request: ValueRequest,
	ledger: Ledger,
	against: AccountRow,
	stored: readonly StoredValuation[],
	ready: readonly Prepared[],
): Run {
	const run: Run = { batch: startBatch(ledger, against, stored), valued: [], failed: [] }
	for (const entry of inApplyOrder(ready)) {
		try {
			run.valued.push(applyEntry(run.batch, entry))
		} catch (error) {
			if (!(error instanceof LedgerValidationError)) throw error
			const at = request.path(entry.index, "value")
			run.failed.push({ index: entry.index, error: ledgerFailure(error, at) })
		}
	}
	return run
}

/**
 * Plans every entry against the Balance the earlier ones leave, in the one read the write holds.
 * Entries apply in date order, then account id order, whatever order they were listed in. Any
 * refusal rolls the whole write back (`rejection` says how it is reported).
 */
export function planValues(request: ValueRequest): TxPlanner<Valuation> {
	return ({ ledger, rows }): Planned<Valuation> | AppError => {
		const against = againstOf(ledger, request)
		if (isAppError(against)) return against
		const { ready, refused } = prepareAll(ledger, against, request)
		if (refused.length > 0) return rejection(request, refused)
		const run = applyAll(request, ledger, against, storedValuations(ledger, rows), ready)
		if (run.failed.length > 0) return rejection(request, run.failed)
		const writes: readonly NewTransaction[] = run.batch.writes
		return { writes, value: { against, rows: run.valued } }
	}
}
