/**
 * Regenerates a migration from the Better Auth options and every installed plugin.
 *
 * Better Auth's own CLI targets Node database drivers; this repository runs D1. `getMigrations`
 * builds the same plan the CLI would, and `compileMigrations` prints the SQLite SQL. The in-memory
 * Bun database is introspection only: it never reaches D1.
 *
 * Run: `bun run schema` (prints the full schema to stdout)
 *      `bun run schema -- --out migrations/0002_rate_limit.sql --only rateLimit`
 *
 * A new table is a new numbered migration. `migrations/0001_init.sql` is history and is never
 * rewritten; the `--only` flag keeps a later migration to the tables it adds.
 */
import { Database } from "bun:sqlite"
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { getMigrations } from "better-auth/db/migration"
import { authOptions } from "../src/auth"
import type { Env } from "../src/env"

const args = process.argv.slice(2)
const out = argument("--out")
const only = argument("--only")
	?.split(",")
	.map((table) => table.trim())
	.filter((table) => table !== "")

const env = {
	BETTER_AUTH_SECRET: "schema-generation-only-secret-at-least-32",
	BETTER_AUTH_URL: "http://localhost:8787",
	ENVIRONMENT: "development",
	DEV_ONLY: "true",
} as Env

const database = new Database(":memory:")
const plan = await getMigrations(authOptions({ env, database }), { throwOnUnsafe: false })
const sql = await plan.compileMigrations()
const selected = only === undefined ? sql : filterStatements(sql, only)
const header = [
	"-- Generated from `bun run schema` in apps/auth. Do not edit by hand.",
	"-- Better Auth 1.7.28 tables: core, jwt, passkey, oauth provider and device authorization.",
	only === undefined ? "" : `-- This migration adds only: ${only.join(", ")}.`,
	"",
].join("\n")

if (out === undefined) {
	console.log(header)
	console.log(selected)
} else {
	const target = resolve(process.cwd(), out)
	writeFileSync(target, `${header}${selected}\n`)
	console.log(`wrote ${out} (${selected.split("\n").length} lines)`)
}

function argument(name: string): string | undefined {
	const index = args.indexOf(name)
	if (index < 0) return undefined
	return args[index + 1]
}

/** Splits compiled DDL on statement boundaries and keeps only the named tables. */
function filterStatements(value: string, tables: readonly string[]): string {
	const statements = value
		.split(/;\s*\n/)
		.map((statement) => statement.trim())
		.filter((statement) => statement !== "")
	const selected = statements.filter((statement) =>
		tables.some((table) => statement.includes(`"${table}"`)),
	)
	return selected.map((statement) => `${statement};`).join("\n\n")
}
