import { describe, expect, it } from "bun:test"
import { expireConsentForSession, prepareConsentForApproval } from "./expiry"
import { concurrentConsent, consentSetup, NOW } from "./fake-consent-adapter"
import type { ConsentRow, FakeConsentDatabase } from "./fake-consent-database"

const CLIENT = "traj-data-collector"
/** Past the ninety-day grant lifetime the fake options set. */
const EXPIRED = "2026-08-01T00:00:00.000Z"

/** A grant the session user owns: `rows` of consent, and one access and refresh token. */
function setup(rows: ConsentRow[] = []) {
	const base = consentSetup(rows)
	base.adapter.consents.tokens = [
		{ model: "oauthAccessToken", id: "old-access", clientId: CLIENT, userId: "user-1" },
		{ model: "oauthRefreshToken", id: "old-refresh", clientId: CLIENT, userId: "user-1" },
	]
	const ctx = {
		...base.ctx,
		context: { ...base.ctx.context, session: { user: { id: "user-1" } } },
	}
	return { adapter: base.adapter, options: base.options, store: base.adapter.consents, ctx }
}

function tokenIds(store: FakeConsentDatabase): string[] {
	return store.tokens.map((row) => row.id).sort()
}

describe("expireConsentForSession", () => {
	it("reads no token row when a live consent already exists", async () => {
		const { store, ctx, options } = setup([concurrentConsent("other", NOW)])
		await expireConsentForSession(ctx, CLIENT, options)
		expect(store.tokenStatements).toEqual([])
		expect(tokenIds(store)).toEqual(["old-access", "old-refresh"])
		expect(store.rows.map((row) => row.id)).toEqual(["other"])
	})

	it("reads no token row when there is no consent to expire", async () => {
		const { store, ctx, options } = setup()
		await expireConsentForSession(ctx, CLIENT, options)
		expect(store.tokenStatements).toEqual([])
	})

	it("deletes the expired consent with its family", async () => {
		const { store, ctx, options } = setup([concurrentConsent("old", EXPIRED)])
		await expireConsentForSession(ctx, CLIENT, options)
		expect(store.rows).toEqual([])
		expect(store.tokens).toEqual([])
	})

	it("keeps a token another approval mints after the read that decides the delete", async () => {
		const { adapter, store, ctx, options } = setup([concurrentConsent("old", EXPIRED)])
		// The second consent read is the one that decides the delete: a token minted after it is
		// not in the snapshot, so it belongs to an approval this pass may not touch.
		adapter.afterRead = (_rows, read) => {
			if (read !== 2) return
			store.tokens.push(
				{ model: "oauthAccessToken", id: "fresh-access", clientId: CLIENT, userId: "user-1" },
				{ model: "oauthRefreshToken", id: "fresh-refresh", clientId: CLIENT, userId: "user-1" },
			)
		}
		await expireConsentForSession(ctx, CLIENT, options)
		expect(tokenIds(store)).toEqual(["fresh-access", "fresh-refresh"])
	})

	it("deletes nothing when another approval's consent lands before the second read", async () => {
		const { adapter, store, ctx, options } = setup([concurrentConsent("old", EXPIRED)])
		// The other approval replaces the expired row while this request's first read runs.
		adapter.afterRead = (rows, read) => {
			if (read !== 1) return
			rows.splice(0, rows.length, concurrentConsent("other", NOW))
		}
		await expireConsentForSession(ctx, CLIENT, options)
		// The second read sees its live consent: the family is that approval's, not a leftover.
		expect(tokenIds(store)).toEqual(["old-access", "old-refresh"])
		expect(store.rows.map((row) => row.id)).toEqual(["other"])
	})

	it("deletes a leftover family when there is no consent at all", async () => {
		const { store, ctx, options } = setup()
		await prepareConsentForApproval(ctx, CLIENT, options)
		expect(store.tokens).toEqual([])
	})
})
