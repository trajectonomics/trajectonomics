import type { SQLQueryBindings } from "bun:sqlite"
import { Database } from "bun:sqlite"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { D1Database } from "@cloudflare/workers-types"

class Statement {
	constructor(
		private readonly database: Database,
		private readonly sql: string,
		private readonly values: readonly unknown[] = [],
	) {}

	bind(...values: unknown[]): Statement {
		return new Statement(this.database, this.sql, values)
	}

	async first<T>(): Promise<T | null> {
		return (this.database.prepare(this.sql).get(...(this.values as SQLQueryBindings[])) ??
			null) as T | null
	}

	async all<T>(): Promise<{ results: T[] }> {
		return {
			results: this.database.prepare(this.sql).all(...(this.values as SQLQueryBindings[])) as T[],
		}
	}

	async run(): Promise<unknown> {
		this.execute()
		return {}
	}

	execute(): void {
		this.database.prepare(this.sql).run(...(this.values as SQLQueryBindings[]))
	}
}

class TestD1 {
	constructor(private readonly database: Database) {}

	prepare(sql: string): Statement {
		return new Statement(this.database, sql)
	}

	async batch(statements: Statement[]): Promise<unknown[]> {
		const run = this.database.transaction(() => {
			for (const statement of statements) statement.execute()
		})
		run()
		return []
	}
}

export type TestDb = {
	database: Database
	db: D1Database
}

/** Applies the real migration to an in-memory SQLite database behind the D1 methods we use. */
export function testDb(): TestDb {
	const database = new Database(":memory:")
	database.exec(readFileSync(join(import.meta.dir, "../../migrations/0001_init.sql"), "utf8"))
	return { database, db: new TestD1(database) as unknown as D1Database }
}
