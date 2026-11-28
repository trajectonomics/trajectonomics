import { describe, expect, it } from "bun:test"
import { recordConsent } from "./consent-record"
import { concurrentConsent, consentSetup, NOW } from "./fake-consent-adapter"
import type { ConsentRow, FakeConsentDatabase, TokenRow } from "./fake-consent-database"

/** Ninety days of hourly rotations is 2,160 refresh rows and as many access tokens; round it up. */
const ROWS = 2_500
const CLIENT = "traj-data-collector"

/** A family of `rows` access and `rows` refresh tokens, all owned by the grant. */
function family(rows: number): TokenRow[] {
	const token = (model: string, index: number): TokenRow => ({
		model,
		id: `${model}-${index}`,
		clientId: CLIENT,
		userId: "user-1",
	})
	return [
		...Array.from({ length: rows }, (_, index) => token("oauthAccessToken", index)),
		...Array.from({ length: rows }, (_, index) => token("oauthRefreshToken", index)),
	]
}

/** One approval over a family of `rows` token pairs, and what it spent to write itself. */
async function record(rows: number, live: ConsentRow[] = []) {
	const setup = consentSetup(live)
	setup.adapter.consents.tokens = family(rows)
	await recordConsent(setup.ctx, setup.input, setup.options)
	const adapter = setup.adapter
	const store: FakeConsentDatabase = adapter.consents
	// Every D1 statement an invocation makes: one per adapter call, and the consent path's own SQL.
	return { adapter, store, queries: adapter.models.length + store.queries }
}

describe("recordConsent's D1 budget", () => {
	it("spends eight statements on a new consent, whatever the family holds", async () => {
		// 4 adapter reads and writes, the snapshot, the batch's two deletes, the code delete.
		expect((await record(1)).queries).toBe(8)
		expect((await record(ROWS)).queries).toBe(8)
	})

	it("spends two fewer for an empty family: the delete batch it skips", async () => {
		const empty = await record(0)
		expect(empty.queries).toBe(6)
		expect(empty.store.batches).toEqual([])
		expect((await record(ROWS)).store.batches).toHaveLength(1)
	})

	it("never touches a token row when a live consent merges", async () => {
		const live = [concurrentConsent("other", NOW)]
		expect((await record(0, live)).queries).toBe(2)
		const full = await record(ROWS, live)
		// One consent read and the conditional merge; no snapshot, no batch, no token model.
		expect(full.queries).toBe(2)
		expect(full.store.tokenStatements).toEqual([])
		expect(full.adapter.models).toEqual(["oauthConsent"])
	})
})
