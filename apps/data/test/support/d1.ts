import type { SQLQueryBindings } from "bun:sqlite"
import { Database } from "bun:sqlite"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { D1Database } from "@cloudflare/workers-types"

export class Statement {
	constructor(
		private readonly database: Database,
		private readonly owner: TestD1,
		readonly sql: string,
		readonly values: readonly unknown[] = [],
	) {}

	bind(...values: unknown[]): Statement {
		return new Statement(this.database, this.owner, this.sql, values)
	}

	async first<T>(): Promise<T | null> {
		this.owner.call()
		return (this.database.prepare(this.sql).get(...(this.values as SQLQueryBindings[])) ??
			null) as T | null
	}

	async all<T>(): Promise<{ results: T[] }> {
		this.owner.call()
		return {
			results: this.database.prepare(this.sql).all(...(this.values as SQLQueryBindings[])) as T[],
		}
	}

	async run(): Promise<unknown> {
		this.owner.call()
		this.execute()
		return {}
	}

	execute(): unknown[] {
		return this.database.prepare(this.sql).all(...(this.values as SQLQueryBindings[])) as unknown[]
	}
}

class TestD1 {
	calls = 0
	batches: Statement[][] = []
	maxCalls: number | undefined
	beforeBatchHook: (() => void | Promise<void>) | null = null

	constructor(private readonly database: Database) {}

	call(): void {
		this.calls += 1
		if (this.maxCalls !== undefined && this.calls > this.maxCalls) {
			throw new Error(`D1 call budget of ${this.maxCalls} exceeded`)
		}
	}

	prepare(sql: string): Statement {
		return new Statement(this.database, this, sql)
	}

	async batch(statements: Statement[]): Promise<unknown[]> {
		this.call()
		this.batches.push(statements)
		const hook = this.beforeBatchHook
		this.beforeBatchHook = null
		if (hook !== null) await hook()
		const run = this.database.transaction(() =>
			statements.map((statement) => ({ results: statement.execute() })),
		)
		return run()
	}
}

export type TestDb = {
	database: Database
	db: D1Database
	calls: () => number
	batches: () => Statement[][]
	/** Runs a one-shot callback just before the next real batch commits, so a test can interleave. */
	beforeNextBatch: (hook: () => void | Promise<void>) => void
}

/** Applies the real migrations, in order, to an in-memory SQLite database behind D1's methods. */
export function testDb(options: { maxCalls?: number } = {}): TestDb {
	const database = new Database(":memory:")
	// D1 enforces foreign keys, so the shim must too.
	database.exec("PRAGMA foreign_keys = ON")
	const migrations = join(import.meta.dir, "../../migrations")
	for (const file of readdirSync(migrations)
		.filter((name) => name.endsWith(".sql"))
		.sort()) {
		database.exec(readFileSync(join(migrations, file), "utf8"))
	}
	const d1 = new TestD1(database)
	d1.maxCalls = options.maxCalls
	return {
		database,
		db: d1 as unknown as D1Database,
		calls: () => d1.calls,
		batches: () => d1.batches,
		beforeNextBatch: (hook) => {
			d1.beforeBatchHook = hook
		},
	}
}
