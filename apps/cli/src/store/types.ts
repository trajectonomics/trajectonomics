import type { ChartOfAccounts } from "@trajectonomics/core/ledger"
import type { AppError } from "../errors"
import type { AccountClosed, AccountCreated, AccountDeleted, NewAccount } from "./account-types"
import type { Ledger } from "./ledger"
import type { PreMigrationCopy } from "./pre-migration-files"
import type { RestoreCounts, RestoreRows } from "./restore-types"
import type { AccountRow, EntityRow, PostingRow, TxRow } from "./rows"
import type { ScenarioStore } from "./scenario-store"
import type { TxFilter } from "./tx-filter"
import type { NewAmendment, NewTransaction, TxAdded, TxAmended, TxVoided } from "./tx-types"

export type * from "./account-types"
export type { Ledger } from "./ledger"
export type * from "./restore-types"
export type {
	AccountRow,
	EntityRow,
	PostingRow,
	ScenarioRow,
	TxCorrection,
	TxRow,
} from "./rows"
export type * from "./scenario-store"
export type * from "./scenario-types"
export type { TxFilter } from "./tx-filter"
export type {
	ImportRejection,
	NewAmendment,
	NewPosting,
	NewTransaction,
	TxAdded,
	TxAmended,
	TxStatus,
	TxVoided,
	TxWritten,
} from "./tx-types"

/** The only source of time the store reads. Nothing in the store calls `Date.now()`. */
export type Clock = () => Date

/** Every list names its order; each order ends on a unique key, so it is total. */
export type EntitySort = "id"
export type AccountSort = "id" | "name" | "created_at"
export type TxSort = "id" | "date" | "created_at"
export type PostingSort = "tx_id"
export type ScenarioSort = "id" | "name" | "created_at"

export type ListOptions<S> = {
	sort: S
	/** Include tombstoned rows (the export needs them). Defaults to false. */
	includeDeleted?: boolean
}

/** Runs the write for real, then rolls it back before commit (ADR-0019). */
export type WriteOptions = { dryRun?: boolean }

/**
 * The only code that reads or writes `traj.db`. Every method returns its value or an `AppError`
 * built by `fail()`; none throws for an expected failure.
 */
export interface Store extends ScenarioStore {
	/** The database file this store owns. */
	readonly path: string
	/**
	 * The copy written because opening this store migrated the database, so a caller can say where
	 * to go back to. Absent for a database already at head and for a new one (cli ADR-0050).
	 */
	readonly upgradedFrom: PreMigrationCopy | undefined
	/** The personal entity every account, transaction and scenario belongs to. */
	readonly entityId: string
	/** `PRAGMA user_version`: the schema version the export header carries. */
	schemaVersion(): number | AppError
	listEntities(options: ListOptions<EntitySort>): EntityRow[] | AppError
	createAccount(input: NewAccount, options?: WriteOptions): AccountCreated | AppError
	listAccounts(options: ListOptions<AccountSort>): AccountRow[] | AppError
	/** The non-tombstoned account this id or exact name names; an id is read first (ADR-0018). */
	getAccount(idOrName: string): AccountRow | null | AppError
	/** Direct children of one account, by name; archived children stay, tombstones never appear. */
	listChildAccounts(parentId: string): AccountRow[] | AppError
	closeAccount(id: string, options?: WriteOptions): AccountClosed | AppError
	deleteAccount(id: string): AccountDeleted | AppError
	/** The entity's full chart, archived accounts included; the core builds and validates against it. */
	chart(): ChartOfAccounts | AppError
	/**
	 * The whole Ledger as one read: the chart, the core's Transactions in id order, and the stored
	 * Account rows in name order. Every Transaction is re-validated before it is handed back.
	 */
	ledger(): Ledger | AppError
	addTransaction(input: NewTransaction, options?: WriteOptions): TxAdded | AppError
	/**
	 * Writes every built row in one transaction, in input order; the batch reads the clock once.
	 * Any rejection rolls the whole batch back and lists `{ index, reason }` for each rejected row.
	 */
	importTransactions(
		inputs: readonly NewTransaction[],
		options?: WriteOptions,
	): readonly TxAdded[] | AppError
	voidTransaction(id: string, input: { date: string }, options?: WriteOptions): TxVoided | AppError
	/** Writes the reversal and the replacement in one transaction, both linked to the original. */
	amendTransaction(id: string, input: NewAmendment, options?: WriteOptions): TxAmended | AppError
	listTransactions(options: { sort: TxSort } & TxFilter): TxRow[] | AppError
	/** The transaction with this id in the personal entity, or null. */
	getTransaction(id: string): TxRow | null | AppError
	listPostings(options: { sort: PostingSort; filter?: TxFilter }): PostingRow[] | AppError
	/**
	 * Every row of every table, tombstones included, in the export's canonical order, read inside
	 * one deferred read transaction so one dump never mixes two snapshots.
	 */
	dump(): RestoreRows | AppError
	/** Each table's tombstone-inclusive row count, equal to the dump's own counts. */
	counts(): RestoreCounts | AppError
	/** `PRAGMA integrity_check`: `["ok"]` on a healthy database, else SQLite's own findings. */
	integrity(): string[] | AppError
	/**
	 * Writes `rows` verbatim (ids, versions, timestamps, tombstones) into a database holding only
	 * the seeded personal entity, in one transaction that reads no clock. References may point
	 * forward; any left dangling roll the whole restore back.
	 */
	restore(rows: RestoreRows): RestoreCounts | AppError
	close(): void
}
