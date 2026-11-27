/**
 * The committed migrations, applied in order, must produce the tables the plugins declare. A
 * plugin field with no column is a runtime failure on the first write, so a forgotten migration
 * fails here instead of in production.
 */
import { Database } from "bun:sqlite"
import { describe, expect, it } from "bun:test"
import { readdirSync, readFileSync } from "node:fs"
import { marketingConsentSchema } from "./marketing-consent-schema"
import { pendingDeletion } from "./pending-deletion"

const MIGRATIONS = new URL("../migrations/", import.meta.url)

/** A fresh in-memory database with every committed migration applied in file order. */
function migrated(): Database {
	const database = new Database(":memory:")
	const files = readdirSync(MIGRATIONS, { encoding: "utf8" })
		.filter((file) => file.endsWith(".sql"))
		.sort()
	for (const file of files) {
		database.exec(readFileSync(new URL(file, MIGRATIONS), "utf8"))
	}
	return database
}

/** The column names one table holds. */
function columnsOf(database: Database, table: string): readonly string[] {
	const rows = database.query(`pragma table_info("${table}")`).all() as { name: string }[]
	return rows.map((row) => row.name)
}

describe("the committed migrations", () => {
	it("apply in order and create every column the account plugins declare", () => {
		const database = migrated()
		const declared = [
			...Object.entries(marketingConsentSchema().marketingConsent.fields).map(
				([field]) => ["marketingConsent", field] as const,
			),
			...Object.keys(pendingDeletion().schema.pendingDeletion.fields).map(
				(field) => ["pendingDeletion", field] as const,
			),
		]
		for (const [table, field] of declared) {
			expect({ table, field, present: columnsOf(database, table).includes(field) }).toEqual({
				table,
				field,
				present: true,
			})
		}
	})

	it("keep the queue's retry column and the consent language column", () => {
		const database = migrated()
		expect(columnsOf(database, "pendingDeletion")).toContain("nextAttemptAt")
		expect(columnsOf(database, "marketingConsent")).toContain("language")
	})
})
