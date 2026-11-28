/**
 * A D1 binding over in-memory rows, for the few statements the consent path issues.
 *
 * Every statement that runs is recorded in `ran`, one entry per statement and one per statement
 * inside a batch: D1 counts each of those against the per-invocation query limit, so a test can
 * assert the budget without counting anything itself. `batches` keeps the SQL of each batch, so a
 * test can say the two token deletes went in as one transaction.
 */
import type { D1Database, D1PreparedStatement } from "@cloudflare/workers-types"

export type RanStatement = { sql: string; params: unknown[] }
export type StatementResult = { results: unknown[]; changes: number }
export type StatementHandler = (sql: string, params: unknown[]) => StatementResult

/** The prepared statement this fake hands out: `bind` replaces the values, a read runs them. */
class Prepared {
	private readonly execute: (statement: RanStatement) => StatementResult
	private readonly sql: string
	private readonly params: unknown[]

	constructor(
		execute: (statement: RanStatement) => StatementResult,
		sql: string,
		params: unknown[],
	) {
		this.execute = execute
		this.sql = sql
		this.params = params
	}

	bind(...params: unknown[]): Prepared {
		return new Prepared(this.execute, this.sql, params)
	}

	sqlOf(): string {
		return this.sql
	}

	async all(): Promise<{ success: true; results: unknown[]; meta: { changes: number } }> {
		const { results } = this.execute({ sql: this.sql, params: this.params })
		return { success: true, results, meta: { changes: 0 } }
	}

	async run(): Promise<{ success: true; results: unknown[]; meta: { changes: number } }> {
		const { changes } = this.execute({ sql: this.sql, params: this.params })
		return { success: true, results: [], meta: { changes } }
	}
}

export function fakeD1(input: {
	ran: RanStatement[]
	batches: string[][]
	handle: StatementHandler
}): D1Database {
	const execute = (statement: RanStatement): StatementResult => {
		input.ran.push(statement)
		return input.handle(statement.sql, statement.params)
	}
	return {
		prepare: (sql: string) => new Prepared(execute, sql, []),
		batch: async (statements: D1PreparedStatement[]) => {
			input.batches.push(statements.map((statement) => preparedOf(statement).sqlOf()))
			const results: unknown[] = []
			for (const statement of statements) results.push(await preparedOf(statement).run())
			return results
		},
	} as unknown as D1Database
}

function preparedOf(statement: D1PreparedStatement): Prepared {
	return statement as unknown as Prepared
}
