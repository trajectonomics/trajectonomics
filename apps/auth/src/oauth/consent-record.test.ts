import { describe, expect, it } from "bun:test"
import { recordConsent } from "./consent-record"
import { type ConsentRow, FakeConsentDatabase } from "./fake-consent-database"

type Where = Array<{ field: string; value: unknown }>
type AdapterInput = { model: string; where: Where; update?: Record<string, unknown> }
const NOW = "2026-11-28T00:00:00.000Z"

/** Enough of the consent adapter for `recordConsent`: the re-read happens right after the insert. */
class FakeAdapter {
	rows: ConsentRow[] = []
	concurrentRow: ((rows: ConsentRow[]) => void) | undefined

	findOne = async (): Promise<unknown> => null

	findMany = async ({ model, where }: AdapterInput): Promise<unknown[]> => {
		if (model !== "oauthConsent") return []
		return this.rows.filter((row) => matches(row, where)).slice(0, 100)
	}

	create = async ({ data }: { data: Record<string, unknown> }): Promise<unknown> => {
		const row = { ...data, id: `consent-${this.rows.length + 1}` } as ConsentRow
		this.rows.push(row)
		this.concurrentRow?.(this.rows)
		return row
	}

	update = async ({ where, update = {} }: AdapterInput): Promise<unknown> => {
		const row = this.rows.find((candidate) => matches(candidate, where))
		if (row !== undefined) Object.assign(row, update)
		return row ?? null
	}

	delete = async ({ where }: AdapterInput): Promise<unknown> => {
		this.rows = this.rows.filter((row) => !matches(row, where))
		return null
	}

	deleteMany = async (): Promise<unknown> => null
}

function matches(row: ConsentRow, where: Where): boolean {
	return where.every((clause) => row[clause.field] === clause.value)
}

function setup(concurrentRow?: (rows: ConsentRow[]) => void) {
	const adapter = new FakeAdapter()
	adapter.concurrentRow = concurrentRow
	const consents = new FakeConsentDatabase()
	const ctx = { context: { adapter }, headers: new Headers({ "x-spike-now": NOW }) }
	const options = {
		absoluteLifetimeSeconds: 7_776_000,
		testClock: true,
		spikeHold: false,
		database: consents.database,
	}
	const input = {
		clientId: "traj-data-collector",
		userId: "user-1",
		scopes: ["openid"],
		resources: ["https://trajectonomics.com/data"],
	}
	return { adapter, consents, ctx, options, input }
}

describe("recordConsent", () => {
	it("records the created row when its own insert is the only one", async () => {
		const { ctx, options, input } = setup()
		const write = await recordConsent(ctx, input, options)
		expect(write).toEqual({ kind: "created", id: "consent-1", writtenAt: new Date(NOW) })
	})

	it("records no undo when a concurrent approval's row became the keeper", async () => {
		const { adapter, ctx, options, input } = setup((rows) => {
			rows.unshift({ ...concurrent("consent-0"), createdAt: NOW })
		})
		const write = await recordConsent(ctx, input, options)
		expect(write).toEqual({ kind: "none" })
		// The older row is the grant now; this request's own row was merged into it and deleted.
		expect(adapter.rows.map((row) => row.id)).toEqual(["consent-0"])
	})

	it("records no undo when this request's row became the keeper of a concurrent approval", async () => {
		const { adapter, ctx, options, input } = setup((rows) => {
			rows.push({ ...concurrent("consent-9"), createdAt: NOW })
		})
		const write = await recordConsent(ctx, input, options)
		// Another approval merged into this row; a failed request must not delete it.
		expect(write).toEqual({ kind: "none" })
		expect(adapter.rows.map((row) => row.id)).toEqual(["consent-1"])
		const scopes = adapter.rows[0]?.["scopes"] as string[]
		expect(scopes.sort()).toEqual(["data:ingest", "openid"])
	})
})

function concurrent(id: string): ConsentRow {
	return {
		id,
		clientId: "traj-data-collector",
		userId: "user-1",
		scopes: ["data:ingest"],
		resources: ["https://trajectonomics.com/data"],
	}
}
