import { describe, expect, it } from "bun:test"
import { recordConsent } from "./consent-record"
import { concurrentConsent, consentSetup, EARLIER, NOW } from "./fake-consent-adapter"
import type { TokenRow } from "./fake-consent-database"

const READ = "2026-11-28T00:00:00.500Z"

/** A token row as the library stores one: the model it belongs to, and a whole-second createdAt. */
function token(model: string, id: string, createdAt: string): TokenRow {
	return { model, id, clientId: "traj-data-collector", userId: "user-1", createdAt }
}

describe("recordConsent", () => {
	it("records the created row when its own insert is the only one", async () => {
		const { ctx, options, input } = consentSetup()
		const write = await recordConsent(ctx, input, options)
		expect(write).toEqual({ kind: "created", id: "consent-1", writtenAt: new Date(NOW) })
	})

	it("records no undo when a concurrent approval's row became the keeper", async () => {
		const { adapter, ctx, options, input } = consentSetup()
		adapter.afterInsert = (rows) => rows.unshift(concurrentConsent("consent-0"))
		const write = await recordConsent(ctx, input, options)
		expect(write).toEqual({ kind: "none" })
		// The older row is the grant now; this request's own row was merged into it and deleted.
		expect(adapter.consents.rows.map((row) => row.id)).toEqual(["consent-0"])
	})

	it("records no undo when this request's row became the keeper of a concurrent approval", async () => {
		const { adapter, ctx, options, input } = consentSetup()
		adapter.afterInsert = (rows) => rows.push(concurrentConsent("consent-9"))
		const write = await recordConsent(ctx, input, options)
		// Another approval merged into this row; a failed request must not delete it.
		expect(write).toEqual({ kind: "none" })
		expect(adapter.consents.rows.map((row) => row.id)).toEqual(["consent-1"])
		const scopes = JSON.parse(String(adapter.consents.rows[0]?.["scopes"])) as string[]
		expect(scopes.sort()).toEqual(["data:ingest", "openid"])
	})

	it("stamps a merge later than an updatedAt that equals the clock", async () => {
		const { adapter, ctx, options, input } = consentSetup([concurrentConsent("other", NOW)])
		const write = await recordConsent(ctx, input, options)
		expect(write).toMatchObject({
			kind: "merged",
			id: "other",
			writtenAt: new Date("2026-11-28T00:00:00.001Z"),
		})
		expect(adapter.consents.rows[0]?.["updatedAt"]).toBe("2026-11-28T00:00:00.001Z")
	})

	it("keeps a token minted after the snapshot, though its whole-second createdAt is earlier than the read", async () => {
		const setup = consentSetup()
		const { adapter, options, input } = setup
		// The read lands mid-second. The library stamps a token's createdAt at the start of the
		// second, so a token minted after the snapshot still carries an earlier createdAt.
		const ctx = { ...setup.ctx, headers: new Headers({ "x-spike-now": READ }) }
		adapter.consents.tokens.push(
			token("oauthAccessToken", "old-access", "2026-11-27T23:59:59.999Z"),
			token("oauthRefreshToken", "old-refresh", "2026-11-27T23:59:59.999Z"),
		)
		// Another approval mints its token after this request's snapshot and before its delete.
		adapter.consents.afterSnapshot = () => {
			adapter.consents.tokens.push(
				token("oauthAccessToken", "fresh-access", "2026-11-28T00:00:00.000Z"),
				token("oauthRefreshToken", "fresh-refresh", "2026-11-28T00:00:00.000Z"),
			)
		}
		await recordConsent(ctx, input, options)
		// The pre-snapshot tokens are gone; the token the snapshot never saw survives the delete.
		expect(adapter.consents.tokens.map((row) => row.id).sort()).toEqual([
			"fresh-access",
			"fresh-refresh",
		])
	})

	it("deletes nothing when an approval lands between the snapshot and the second read", async () => {
		const { adapter, ctx, options, input } = consentSetup()
		adapter.consents.tokens.push(
			token("oauthAccessToken", "old-access", EARLIER),
			token("oauthRefreshToken", "old-refresh", EARLIER),
		)
		// The other approval writes its live consent after this request listed the family.
		adapter.consents.afterSnapshot = () => {
			adapter.consents.rows.push(concurrentConsent("other"))
		}
		const write = await recordConsent(ctx, input, options)
		// The second read sees that consent: it owns the family, so this approval merges into it.
		expect(write).toMatchObject({ kind: "merged", id: "other" })
		expect(adapter.consents.tokens.map((row) => row.id).sort()).toEqual([
			"old-access",
			"old-refresh",
		])
	})
})
