# An upgrade copies the database before it migrates it, and refuses to migrate without the copy

A newer `traj` migrates the database in place on open, and an older one then refuses it with `database_too_new` (ADR-0014, `src/store/migrations.ts`). Every step is transactional, but a person who upgrades and wants to go back has nothing to go back to unless they ran `traj backup` first, and a `traj backup` is a JSONL dump that only a release that reads that schema can restore. cli#155 asked for a decision before the next schema version ships; versions 2 and 3 already have.

**Before the first step runs on a database that holds a schema version, the store writes a copy of that database beside it.** The copy is `traj.db.pre-v<N>.bak`, where `N` is the schema version the database held, so the name says what it is. The rule is in `connect`: a database at version 1 or above and below head is copied; a database at version 0 (what `traj init` leaves, an empty file) holds nothing to go back to and is not; a database at head is not opened for writing at all and is not copied.

**The copy is SQLite's own, not a file copy and not the Backup.** It is written by `VACUUM INTO`, which reads one snapshot of the whole database including the WAL, so a copy never misses what a concurrent writer committed and never holds half of it. It is a plain SQLite database at the old schema version: the older `traj` opens it as it opens any ledger. It is written under a private temporary name with mode 0600 (the ledger is someone's money, ADR-0014), opened read-only to check it holds the version in its name, and only then renamed onto its final name, so a file with that name is whole. If the check finds the database already past that version, another opener migrated first and holds the copy; the temporary file is discarded. The Backup (ADR-0038) could not serve: `traj backup` dumps the rows through the code of the current schema, and a database that still has the old one is the case it cannot read.

**One copy per schema version; the newest replaces the older.** The pruning rule is the name itself. Restoring an older copy and upgrading again writes the same name again and replaces the earlier file; the copies of other versions stay. The most there can be is one per version below head, a few small files, and each is the point a person can return to from a later release too. Nothing else is deleted: a rule that removed a copy by age would remove it by the clock (ADR-0018), and a person decides when a copy has served its purpose. `traj data remove` deletes the database's files only (ADR-0038), so the copies stay beside it; they are plaintext money and the person is told where they are.

**A copy that cannot be written refuses the migration.** The store returns `disk_full` for a full disk, `permission_denied` for a directory it cannot write, and `migration_failed` for anything else, each naming the copy's path; none of these is new, so the registry does not change. Nothing has been written to the database by then: the failure comes before the first step, and the database stays at its version. A migration without a copy is the failure this decision exists to prevent, and retrying after freeing space or fixing the directory is cheap. A busy database is still `database_busy`, retried like any write.

**The person is told once, and only on success.** The run that upgraded prints one line on stderr after its command finished, naming the versions, the copy's path and how to go back: install a release that writes that schema version, delete `traj.db`, `traj.db-wal` and `traj.db-shm`, and copy the file to `traj.db`. The two side files belong to the migrated database and SQLite would replay them onto the copy, which is why they are named. Like the usage notice (ADR-0045), the line is plain text and appears only when the exit code is 0, so it never sits beside a JSON error envelope on stderr (ADR-0010, ADR-0013); a failed command is answered by its envelope alone. The next run opens a database at head, so nothing repeats. `--json` stdout is unchanged. The line is written by `withStore`, so a command that opens the store any other way (`traj doctor`) reports the copy in its result instead.

**`traj doctor` reports the copies.** The result's `database.preMigrationCopies` lists each copy's path, schema version and size, oldest version first, and the `database` check names them in its sentence. Doctor still writes no row of its own: opening an older database migrates it (ADR-0038), so the copy is the one write it can cause, and it lists the copy that write made.

**Usage counts record no path.** The usage event holds the exit code and the error code, so a refused migration is counted as `migration_failed` and the copy's path, in the error's `message` and `details`, never leaves the machine (ADR-0045). A test pins that.

## Considered options

- **Tell the person to run `traj backup` first (the issue's second option).** Rejected: an upgrade is often a package manager's doing, no one reads a hint before a first open, and the Backup cannot be restored by an older release that does not read the new schema.
- **A file copy of `traj.db`.** Rejected: in WAL mode the committed pages may be in `traj.db-wal`, so a copy of the one file can miss rows or tear against a writer. `VACUUM INTO` is one snapshot.
- **Migrating anyway when the copy fails, and saying so.** Rejected above: it is the case the copy exists for.
- **Prune by age or keep the last N.** Rejected above: it needs the clock, and the version in the name is already the bound.
- **A new `migration_backup_failed` code.** Rejected: the disk and the directory already have codes with the path and a hint, and "anything else" is a migration that did not happen.

## Consequences

The first run of a release that ships a schema step is slower by one copy of the database and needs about its size in free space beside it. A ledger is small, and the failure is a clear one that leaves the database as it was.

Going back is manual and not tested end to end across releases; the tests open the copy and check it holds the old version and the old rows. The copies are never read by the current `traj`: nothing restores from one, so no format outlives the schema it holds.

The README names the copies in the section on keeping a backup, with the release marker `> **Ships in 0.8.0.**` until that release is on npm (ADR-0034).
