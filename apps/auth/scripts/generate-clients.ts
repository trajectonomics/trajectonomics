/**
 * Writes the first-party client migration from the pure manifest in `src/core/clients.ts`.
 *
 * Production keeps `clientPrivileges` closed, so the first-party clients cannot be registered over
 * HTTP. The migration inserts the resource rows, the two public clients, and the one link from
 * each client to its audience. It is generated once:
 *
 *   bun run clients:sql
 *
 * The generator refuses to overwrite an existing file. 0003 is history once committed; a later
 * manifest change ships as a new numbered migration with explicit `update`/`insert` statements
 * (ADR 0002), never by regenerating this one. The unit test in `src/core/clients-migration.test.ts`
 * fails when the committed file and this generator's output drift.
 */
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { clientsSql } from "./clients-sql"

const OUT = "migrations/0003_oauth_clients.sql"

const target = resolve(process.cwd(), OUT)
try {
	writeFileSync(target, clientsSql(), { flag: "wx" })
} catch (error) {
	if ((error as NodeJS.ErrnoException).code === "EEXIST") {
		console.error(
			`${OUT} already exists and is never regenerated; a manifest change is a new numbered migration (ADR 0002).`,
		)
		process.exit(1)
	}
	throw error
}
console.log(`wrote ${OUT}`)
