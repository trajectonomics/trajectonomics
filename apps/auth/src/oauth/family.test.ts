import { describe, expect, it } from "bun:test"
import { FakeConsentAdapter } from "./fake-consent-adapter"
import { deleteTokenFamily, type GrantOwner, snapshotTokenFamily } from "./family"

const owner: GrantOwner = { clientId: "traj-data-collector", userId: "user-1" }

/** A family of `access` access tokens and `refresh` refresh tokens, all owned by the grant. */
function setup(access: number, refresh: number) {
	const adapter = new FakeConsentAdapter()
	const token = (model: string, prefix: string, at: number) => ({
		model,
		id: `${prefix}-${String(at).padStart(3, "0")}`,
		clientId: owner.clientId,
		userId: owner.userId,
	})
	adapter.tokens = [
		...Array.from({ length: access }, (_, at) => token("oauthAccessToken", "access", at)),
		...Array.from({ length: refresh }, (_, at) => token("oauthRefreshToken", "refresh", at)),
	]
	return { adapter, ctx: { context: { adapter } } }
}

describe("deleteTokenFamily", () => {
	it("deletes the snapshotted ids in chunks of at most 100, D1's bound-parameter limit", async () => {
		const { adapter, ctx } = setup(250, 120)
		const ids = await snapshotTokenFamily(ctx, owner)
		expect(ids.accessTokenIds).toHaveLength(250)
		expect(ids.refreshTokenIds).toHaveLength(120)
		await deleteTokenFamily(ctx, ids)
		expect(adapter.tokens).toHaveLength(0)
		const sizes = adapter.deleted.map((where) => {
			const ids = where[0]?.value
			return Array.isArray(ids) ? ids.length : 0
		})
		expect(sizes).toEqual([100, 100, 50, 100, 20])
	})

	it("keeps a token minted after the snapshot", async () => {
		const { adapter, ctx } = setup(1, 0)
		const ids = await snapshotTokenFamily(ctx, owner)
		adapter.tokens.push({
			model: "oauthAccessToken",
			id: "access-999",
			clientId: owner.clientId,
			userId: owner.userId,
		})
		await deleteTokenFamily(ctx, ids)
		expect(adapter.tokens.map((row) => row.id)).toEqual(["access-999"])
	})

	it("deletes nothing for an empty snapshot", async () => {
		const { adapter, ctx } = setup(0, 0)
		await deleteTokenFamily(ctx, { accessTokenIds: [], refreshTokenIds: [] })
		expect(adapter.deleted).toEqual([])
	})
})
