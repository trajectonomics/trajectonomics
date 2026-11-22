import type { Context, Result } from "./command"
import { type AppError, isAppError } from "./errors"
import { HEAD, openStore, type PreMigrationCopy, type Store } from "./store"

const RELEASES = "https://github.com/trajectonomics/trajectonomics/releases"

/**
 * The one line said, once, on the run that upgraded the database: what changed, where the copy
 * is, what going back costs, and how to do it. The stale `-wal` and `-shm` files belong to the
 * migrated database and would be replayed onto the copy, so the way back names them (cli ADR-0050).
 */
export function upgradeNotice(copy: PreMigrationCopy): string {
	return (
		`traj upgraded the database from schema version ${copy.schemaVersion} to ${HEAD}. ` +
		`A copy of it as it was, about the size of the database, is at ${copy.path}. ` +
		`To go back, stop every traj, install the release you used before (${RELEASES}; ` +
		`"traj doctor" on it reports the schema version it writes as "head", which must be ` +
		`${copy.schemaVersion}), delete traj.db, traj.db-wal and traj.db-shm in the data directory, ` +
		`and copy that file to traj.db. Changes made after the upgrade are lost.`
	)
}

/**
 * Opens the store for one command and closes it again, even when the command throws. When the
 * open upgraded the database, the notice is queued on the run, and `run()` prints it only after a
 * result that succeeded: the command may still fail after its store work, and a failure answers
 * with its envelope alone, with no line beside it on stderr (ADR-0010, cli ADR-0050).
 */
export function withStore<T>(
	ctx: Context,
	work: (store: Store) => Result<T> | AppError,
): Result<T> | AppError {
	const store = openStore({ env: ctx.env, clock: () => new Date() })
	if (isAppError(store)) return store
	try {
		if (store.upgradedFrom !== undefined) ctx.afterSuccess?.push(upgradeNotice(store.upgradedFrom))
		return work(store)
	} finally {
		store.close()
	}
}
