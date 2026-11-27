import { describe, expect, it } from "bun:test"
import { recordConsent } from "./consent-record"
import { concurrentConsent, consentSetup, NOW } from "./fake-consent-adapter"

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

	it("keeps a token another approval minted after the read that found no consent", async () => {
		const { adapter, ctx, options, input } = consentSetup()
		const token = (model: string, id: string, createdAt: string) => ({
			model,
			id,
			clientId: "traj-data-collector",
			userId: "user-1",
			createdAt,
		})
		const stale = "2026-11-27T23:59:59.999Z"
		adapter.tokens.push(
			token("oauthAccessToken", "old-access", stale),
			token("oauthRefreshToken", "old-refresh", stale),
		)
		// Another device's approval lands between this read and this request's delete.
		adapter.afterRead = (_rows, read) => {
			if (read !== 1) return
			adapter.tokens.push(
				token("oauthAccessToken", "fresh-access", NOW),
				token("oauthRefreshToken", "fresh-refresh", NOW),
			)
		}
		await recordConsent(ctx, input, options)
		expect(adapter.tokens.map((row) => row.id).sort()).toEqual(["fresh-access", "fresh-refresh"])
	})
})
