import { type AppError, isAppError } from "../errors"
import type { Ctx } from "./context"
import { write } from "./guard"
import { iso } from "./ids"
import { readLedger } from "./ledger"
import { attemptTransaction } from "./transactions"
import { listTransactions } from "./tx-reads"
import type {
	NewTransaction,
	PlannedRead,
	PlannedWrite,
	TxAdded,
	TxPlanner,
	WriteOptions,
} from "./types"

/** What a planner reads: the Ledger and the stored rows, both inside the write that follows. */
function readFor(ctx: Ctx): PlannedRead | AppError {
	const ledger = readLedger(ctx)
	if (isAppError(ledger)) return ledger
	const rows = listTransactions(ctx, { sort: "id" })
	return isAppError(rows) ? rows : { ledger, rows }
}

/** Appends each row in order from one clock reading, stopping at the first the store refuses. */
function appendAll(ctx: Ctx, inputs: readonly NewTransaction[]): TxAdded[] | AppError {
	const at = ctx.clock()
	const stamp = iso(at)
	const written: TxAdded[] = []
	for (const input of inputs) {
		const outcome = attemptTransaction(ctx, input, () => ({ id: ctx.newId(at), at: stamp }))
		if (isAppError(outcome)) return outcome
		written.push(outcome)
	}
	return written
}

/**
 * One IMMEDIATE transaction that reads the Ledger, lets `plan` derive rows from it, and appends
 * them in order. The read happens after the write lock is taken, so no other writer can move a
 * Balance between the plan and its rows. Every row goes through the store's own checks and the
 * core, and the batch reads the clock once, as `importTransactions` does.
 */
export function writePlanned<T>(
	ctx: Ctx,
	plan: TxPlanner<T>,
	options: WriteOptions = {},
): PlannedWrite<T> | AppError {
	return write(
		ctx.db,
		() => {
			const read = readFor(ctx)
			if (isAppError(read)) return read
			const planned = plan(read)
			if (isAppError(planned)) return planned
			const written = appendAll(ctx, planned.writes)
			return isAppError(written) ? written : { value: planned.value, written }
		},
		options,
	)
}
