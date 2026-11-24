import type { AppError } from "../errors"
import type { Ledger } from "./ledger"
import type { TxRow } from "./rows"
import type { NewTransaction, TxAdded } from "./tx-types"
import type { WriteOptions } from "./types"

/** What a planner reads inside the write: the Ledger, and the stored rows that carry the memos. */
export type PlannedRead = { ledger: Ledger; rows: readonly TxRow[] }

/** The rows a planner decided to append, and whatever the caller needs to report about them. */
export type Planned<T> = { writes: readonly NewTransaction[]; value: T }

/** `writes` as they were stored, in order, beside what the planner reported. */
export type PlannedWrite<T> = { value: T; written: readonly TxAdded[] }

/** Reads inside one write and returns what to append, or a refusal that rolls the write back. */
export type TxPlanner<T> = (read: PlannedRead) => Planned<T> | AppError

export interface Planning {
	/**
	 * Reads the Ledger and appends what `plan` derives from it, all in one IMMEDIATE transaction,
	 * so what the plan read is what the rows were computed against. A refusal from `plan` rolls the
	 * write back; the batch reads the clock once (cli ADR-0072).
	 */
	writePlanned<T>(plan: TxPlanner<T>, options?: WriteOptions): PlannedWrite<T> | AppError
}
