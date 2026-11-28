/**
 * Enough of the consent adapter for `recordConsent`, over the same rows the fake D1 statements
 * touch. Rows hold column text, and a read returns copies, so a change made after it is only seen
 * by a conditional statement or the next read.
 */
import { type ConsentRow, FakeConsentDatabase } from "./fake-consent-database"

type SortBy = { field: string; direction: "asc" | "desc" }
type Where = Array<{ field: string; value: unknown; operator?: "eq" | "lt" | "gt" | "in" }>
type AdapterInput = { model: string; where: Where; limit?: number; sortBy?: SortBy }

export const NOW = "2026-11-28T00:00:00.000Z"
export const EARLIER = "2026-11-01T00:00:00.000Z"
const DATA = "https://trajectonomics.com/data"

export class FakeConsentAdapter {
	/** Consent rows and the family's token rows, the one store the fake D1 statements touch. */
	readonly consents = new FakeConsentDatabase()
	/** Runs once an insert landed: a concurrent approval joining it. */
	afterInsert: ((rows: ConsentRow[]) => void) | undefined
	/** Runs after each consent read: whatever lands before this request writes. */
	afterRead: ((rows: ConsentRow[], read: number) => void) | undefined
	/** Every model this adapter read or wrote, in order: one entry per statement it issued. */
	readonly models: string[] = []
	private reads = 0
	private inserts = 0

	findOne = async (): Promise<unknown> => null

	findMany = async ({ model, where, limit, sortBy }: AdapterInput): Promise<unknown[]> => {
		this.models.push(model)
		// The copies are made before the read hook runs, so a row it changes is only seen next time.
		const found = this.rowsOf(model)
			.filter((row) => matches(row, where))
			.map((row) => ({ ...row }))
		if (sortBy !== undefined) found.sort((left, right) => compare(left, right, sortBy))
		if (model === "oauthConsent") {
			this.reads += 1
			this.afterRead?.(this.consents.rows, this.reads)
		}
		// Better Auth caps a read at 100 rows unless the caller asks for a limit.
		return found.slice(0, limit ?? 100)
	}

	create = async ({ data }: { data: Record<string, unknown> }): Promise<unknown> => {
		this.models.push("oauthConsent")
		this.inserts += 1
		const text = Object.entries(data).map(([key, value]) => [key, columnText(value)])
		const row = { ...Object.fromEntries(text), id: `consent-${this.inserts}` } as ConsentRow
		this.consents.rows.push(row)
		this.afterInsert?.(this.consents.rows)
		return row
	}

	delete = async ({ where }: AdapterInput): Promise<unknown> => {
		this.models.push("oauthConsent")
		this.consents.rows = this.consents.rows.filter((row) => !matches(row, where))
		return null
	}

	/** Consent rows, or the tokens tagged with the model, as the adapter would list them. */
	private rowsOf = (model: string): readonly ConsentRow[] =>
		model === "oauthConsent"
			? this.consents.rows
			: this.consents.tokens.filter((row) => row.model === model)
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
	return where.every(({ field, value, operator = "eq" }) => {
		const at = row[field]
		if (operator === "in")
			return Array.isArray(value) && value.some((item) => at === columnText(item))
		if (operator === "lt") return before(at, value)
		if (operator === "gt") return before(value, at)
		return at === columnText(value)
	})
}

function compare(left: ConsentRow, right: ConsentRow, sortBy: SortBy): number {
	const order = String(left[sortBy.field]).localeCompare(String(right[sortBy.field]))
	return sortBy.direction === "asc" ? order : -order
}

/** The D1 adapter binds a `Date` as its ISO text, so the comparison is text against text. */
function before(value: unknown, limit: unknown): boolean {
	const [text, bound] = [columnText(value), columnText(limit)]
	return typeof text === "string" && typeof bound === "string" && text < bound
}

function columnText(value: unknown): unknown {
	if (value instanceof Date) return value.toISOString()
	return Array.isArray(value) ? JSON.stringify(value) : value
}
