/**
 * Regenerates `migrations/0001_init.sql` from the Better Auth options and every installed plugin.
 *
 * Better Auth's own CLI targets Node database drivers; this repository runs D1. `getMigrations`
 * builds the same plan the CLI would, and `compileMigrations` prints the SQLite SQL. The in-memory
 * Bun database is introspection only: it never reaches D1.
 *
 * Run: `bun run schema`
 */
import { Database } from "bun:sqlite"
import { writeFileSync } from "node:fs"
import { getMigrations } from "better-auth/db/migration"
import { authOptions } from "../src/auth"
import type { Env } from "../src/env"

const env = {
	BETTER_AUTH_SECRET: "schema-generation-only",
	BETTER_AUTH_URL: "http://localhost:8787",
	ENVIRONMENT: "development",
	DEV_ONLY: "true",
} as Env

const database = new Database(":memory:")
const plan = await getMigrations(authOptions({ env, database }), { throwOnUnsafe: false })
const sql = await plan.compileMigrations()
const header = [
	"-- Generated from `bun run schema` in apps/auth. Do not edit by hand.",
	"-- Better Auth 1.7.28 tables: core, jwt, passkey, oauth provider and device authorization.",
	"",
].join("\n")
writeFileSync(new URL("../migrations/0001_init.sql", import.meta.url), `${header}${sql}\n`)
console.log(`wrote migrations/0001_init.sql (${sql.split("\n").length} lines)`)
