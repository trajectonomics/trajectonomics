/**
 * Enough of the consent adapter for `recordConsent`, over the same rows the fake D1 statements
 * touch. Rows hold column text, and a read returns copies, so a change made after it is only seen
 * by a conditional statement or the next read.
 */
import { type ConsentRow, FakeConsentDatabase } from "./fake-consent-database"

type Where = Array<{ field: string; value: unknown }>
type AdapterInput = { model: string; where: Where }

export const NOW = "2026-11-28T00:00:00.000Z"
export const EARLIER = "2026-11-01T00:00:00.000Z"
const DATA = "https://trajectonomics.com/data"

export class FakeConsentAdapter {
	readonly consents = new FakeConsentDatabase()
	/** Runs once an insert landed: a concurrent approval joining it. */
	afterInsert: ((rows: ConsentRow[]) => void) | undefined
	/** Runs after each consent read: whatever lands before this request writes. */
	afterRead: ((rows: ConsentRow[], read: number) => void) | undefined
	private reads = 0
	private inserts = 0

	findOne = async (): Promise<unknown> => null

	findMany = async ({ model, where }: AdapterInput): Promise<unknown[]> => {
		if (model !== "oauthConsent") return []
		const found = this.consents.rows.filter((row) => matches(row, where)).map((row) => ({ ...row }))
		this.reads += 1
		this.afterRead?.(this.consents.rows, this.reads)
		return found.slice(0, 100)
	}

	create = async ({ data }: { data: Record<string, unknown> }): Promise<unknown> => {
		this.inserts += 1
		const text = Object.entries(data).map(([key, value]) => [key, columnText(value)])
		const row = { ...Object.fromEntries(text), id: `consent-${this.inserts}` } as ConsentRow
		this.consents.rows.push(row)
		this.afterInsert?.(this.consents.rows)
		return row
	}

	delete = async ({ where }: AdapterInput): Promise<unknown> => {
		this.consents.rows = this.consents.rows.filter((row) => !matches(row, where))
		return null
	}

	deleteMany = async (): Promise<unknown> => null
}

/** Another approval's row for the same grant. */
export function concurrentConsent(id: string, createdAt = NOW): ConsentRow {
	return {
		id,
		clientId: "traj-data-collector",
		userId: "user-1",
		scopes: JSON.stringify(["data:ingest"]),
		resources: JSON.stringify([DATA]),
		createdAt,
		updatedAt: createdAt,
	}
}

export function consentSetup(rows: ConsentRow[] = []) {
	const adapter = new FakeConsentAdapter()
	adapter.consents.rows = rows
	const ctx = { context: { adapter }, headers: new Headers({ "x-spike-now": NOW }) }
	const options = {
		absoluteLifetimeSeconds: 7_776_000,
		testClock: true,
		spikeHold: false,
		database: adapter.consents.database,
	}
	const input = {
		clientId: "traj-data-collector",
		userId: "user-1",
		scopes: ["openid"],
		resources: [DATA],
	}
	return { adapter, ctx, options, input }
}

function matches(row: ConsentRow, where: Where): boolean {
	return where.every((clause) => row[clause.field] === clause.value)
}

function columnText(value: unknown): unknown {
	if (value instanceof Date) return value.toISOString()
	return Array.isArray(value) ? JSON.stringify(value) : value
}
