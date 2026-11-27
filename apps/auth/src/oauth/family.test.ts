import { describe, expect, it } from "bun:test"
import { FakeConsentDatabase } from "./fake-consent-database"
import { deleteTokenFamily, type GrantOwner, snapshotTokenFamily } from "./family"

const owner: GrantOwner = { clientId: "traj-data-collector", userId: "user-1" }

/** A family of `access` access tokens and `refresh` refresh tokens, all owned by the grant. */
function setup(access: number, refresh: number, at: Partial<GrantOwner> = {}): FakeConsentDatabase {
	const store = new FakeConsentDatabase()
	const token = (model: string, prefix: string, index: number) => ({
		model,
		id: `${prefix}-${String(index).padStart(4, "0")}`,
		clientId: owner.clientId,
		userId: owner.userId,
		...at,
	})
	store.tokens = [
		...Array.from({ length: access }, (_, index) => token("oauthAccessToken", "access", index)),
		...Array.from({ length: refresh }, (_, index) => token("oauthRefreshToken", "refresh", index)),
	]
	return store
}

/** The table a `delete from <table>` statement names. */
function deletedTable(sql: string): string | undefined {
	return sql.split(/\s+/)[2]
}

describe("snapshotTokenFamily", () => {
	it("lists the whole family in one statement", async () => {
		const store = setup(3, 2)
		const ids = await snapshotTokenFamily(store.database, owner)
		expect(ids.accessTokenIds).toHaveLength(3)
		expect(ids.refreshTokenIds).toHaveLength(2)
		expect(store.queries).toBe(1)
	})

	it("lists nothing for another owner", async () => {
		const store = setup(2, 2, { userId: "user-2" })
		const ids = await snapshotTokenFamily(store.database, owner)
		expect(ids).toEqual({ accessTokenIds: [], refreshTokenIds: [] })
	})
})

describe("deleteTokenFamily", () => {
	it("deletes the snapshotted ids in one batch, access tokens first", async () => {
		const store = setup(250, 120)
		const ids = await snapshotTokenFamily(store.database, owner)
		await deleteTokenFamily(store.database, ids)
		expect(store.tokens).toHaveLength(0)
		expect(store.batches).toHaveLength(1)
		const tables = store.batches[0]?.map(deletedTable)
		expect(tables).toEqual([`"oauthAccessToken"`, `"oauthRefreshToken"`])
		// One snapshot and the batch's two statements, whatever the family holds.
		expect(store.queries).toBe(3)
	})

	it("keeps a token minted after the snapshot", async () => {
		const store = setup(1, 0)
		const ids = await snapshotTokenFamily(store.database, owner)
		store.tokens.push({
			model: "oauthAccessToken",
			id: "access-9999",
			clientId: owner.clientId,
			userId: owner.userId,
		})
		await deleteTokenFamily(store.database, ids)
		expect(store.tokens.map((row) => row.id)).toEqual(["access-9999"])
	})

	it("deletes nothing for an empty snapshot", async () => {
		const store = setup(0, 0)
		const ids = await snapshotTokenFamily(store.database, owner)
		await deleteTokenFamily(store.database, ids)
		expect(store.statements).toHaveLength(1)
		expect(store.batches).toEqual([])
	})

	it("skips the statement whose id list is empty", async () => {
		const store = setup(0, 2)
		const ids = await snapshotTokenFamily(store.database, owner)
		await deleteTokenFamily(store.database, ids)
		expect(store.batches).toHaveLength(1)
		expect(store.batches[0]?.map(deletedTable)).toEqual([`"oauthRefreshToken"`])
		expect(store.tokens).toHaveLength(0)
	})
})
