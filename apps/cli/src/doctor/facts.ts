import { existsSync, statSync } from "node:fs"
import { HEAD, preMigrationCopies, unfinishedCopies } from "../store"
import type { DoctorResult } from "./output"

export type DatabaseFacts = DoctorResult["database"]

/** What the result states about the database file: its size, versions and the copies beside it. */
export function factsOf(database: string, schemaVersion: number | null): DatabaseFacts {
	const exists = existsSync(database)
	return {
		path: database,
		exists,
		bytes: exists ? statSync(database).size : 0,
		schemaVersion,
		head: HEAD,
		preMigrationCopies: preMigrationCopies(database),
		unfinishedCopies: unfinishedCopies(database),
	}
}
