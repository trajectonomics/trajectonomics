import type { Context, Result } from "./command"
import { type AppError, isAppError } from "./errors"
import { HEAD, openStore, type PreMigrationCopy, type Store } from "./store"

/**
 * The one line said, once, on the run that upgraded the database: what changed, where the copy
 * is, and how to go back. The stale `-wal` and `-shm` files belong to the migrated database and
 * would be replayed onto the copy, so the way back names them (cli ADR-0050).
 */
export function upgradeNotice(copy: PreMigrationCopy): string {
	return (
		`traj upgraded the database from schema version ${copy.schemaVersion} to ${HEAD}. ` +
		`A copy of it as it was is at ${copy.path}. To go back, install a traj release that writes ` +
		`schema version ${copy.schemaVersion}, delete traj.db, traj.db-wal and traj.db-shm in the ` +
		`data directory, and copy that file to traj.db.`
	)
}

/**
 * Opens the store for one command and closes it again, even when the command throws. When the
 * open upgraded the database, the notice follows a command that succeeded: a failure answers with
 * its envelope alone, and stderr never carries a line beside it (ADR-0010).
 */
export function withStore<T>(
	ctx: Context,
	work: (store: Store) => Result<T> | AppError,
): Result<T> | AppError {
	const store = openStore({ env: ctx.env, clock: () => new Date() })
	if (isAppError(store)) return store
	try {
		const outcome = work(store)
		if (!isAppError(outcome) && store.upgradedFrom !== undefined) {
			ctx.notify?.(upgradeNotice(store.upgradedFrom))
		}
		return outcome
	} finally {
		store.close()
	}
}
