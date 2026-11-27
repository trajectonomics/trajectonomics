import { describe, expect, it } from "bun:test"
import { APIError } from "better-auth/api"
import { rememberDeviceApproval } from "./approval"
import { settleDeviceApproval } from "./approval-settlement"

type Row = { id: string } & Record<string, unknown>
type Where = Array<{ field: string; value: unknown }>

/** The three adapter calls the after-hook makes, over in-memory rows. */
class FakeStore {
	devices: Row[] = []
	consents: Row[] = []
	updates: Array<{ id: string; update: Record<string, unknown> }> = []
	deleted: string[] = []

	adapter = {
		findOne: async ({ model, where }: { model: string; where: Where }): Promise<unknown> => {
			const rows = model === "deviceCode" ? this.devices : this.consents
			return rows.find((row) => rowMatches(row, where)) ?? null
		},
		findMany: async (): Promise<unknown[]> => [],
		create: async (): Promise<unknown> => null,
		update: async ({
			model,
			where,
			update,
		}: {
			model: string
			where: Where
			update: Record<string, unknown>
		}): Promise<unknown> => {
			if (model !== "oauthConsent") return null
			const id = String(where[0]?.value)
			this.updates.push({ id, update })
			const row = this.consents.find((candidate) => candidate.id === id)
			if (row !== undefined) Object.assign(row, update)
			return row ?? null
		},
		delete: async ({ model, where }: { model: string; where: Where }): Promise<unknown> => {
			if (model !== "oauthConsent") return null
			const id = String(where[0]?.value)
			this.deleted.push(id)
			this.consents = this.consents.filter((row) => row.id !== id)
			return null
		},
		deleteMany: async (): Promise<unknown> => null,
	}
}

function rowMatches(row: Row, where: Where): boolean {
	return where.every((clause) => row[clause.field] === clause.value)
}

function context(store: FakeStore, returned: unknown) {
	return { context: { adapter: store.adapter, returned } }
}

const APPROVED = { success: true }
const WRITTEN_AT = new Date("2026-11-28T00:00:00.000Z")

describe("settleDeviceApproval", () => {
	it("keeps the created consent when the endpoint approved the code", async () => {
		const store = new FakeStore()
		store.devices.push({ id: "d1", userCode: "ABCDEFGH", status: "approved", userId: "user-1" })
		const ctx = context(store, APPROVED)
		rememberDeviceApproval(ctx, {
			userCode: "ABCDEFGH",
			userId: "user-1",
			write: { kind: "created", id: "consent-1" },
		})
		await settleDeviceApproval(ctx)
		expect(store.deleted).toEqual([])
	})

	it("deletes the created consent when the endpoint refused the code", async () => {
		const store = new FakeStore()
		store.devices.push({ id: "d1", userCode: "ABCDEFGH", status: "pending", userId: "user-1" })
		const ctx = context(store, new APIError("FORBIDDEN", { error: "access_denied" }))
		rememberDeviceApproval(ctx, {
			userCode: "ABCDEFGH",
			userId: "user-1",
			write: { kind: "created", id: "consent-1" },
		})
		await settleDeviceApproval(ctx)
		expect(store.deleted).toEqual(["consent-1"])
	})

	it("deletes the created consent when the code ended up denied", async () => {
		const store = new FakeStore()
		store.devices.push({ id: "d1", userCode: "ABCDEFGH", status: "denied", userId: "user-1" })
		const ctx = context(store, APPROVED)
		rememberDeviceApproval(ctx, {
			userCode: "ABCDEFGH",
			userId: "user-1",
			write: { kind: "created", id: "consent-1" },
		})
		await settleDeviceApproval(ctx)
		expect(store.deleted).toEqual(["consent-1"])
	})

	it("restores the scopes a failed approval had merged into a live consent", async () => {
		const store = new FakeStore()
		store.consents.push({
			id: "consent-1",
			scopes: ["openid", "data:ingest"],
			resources: ["https://trajectonomics.com/data"],
			updatedAt: WRITTEN_AT,
		})
		const ctx = context(store, new APIError("BAD_REQUEST", { error: "expired_token" }))
		rememberDeviceApproval(ctx, {
			userCode: "ABCDEFGH",
			userId: "user-1",
			write: {
				kind: "merged",
				id: "consent-1",
				previousScopes: ["openid"],
				previousResources: [],
				previousUpdatedAt: "2026-11-01T00:00:00.000Z",
				writtenAt: WRITTEN_AT,
			},
		})
		await settleDeviceApproval(ctx)
		expect(store.updates).toEqual([
			{
				id: "consent-1",
				update: {
					scopes: ["openid"],
					resources: null,
					updatedAt: "2026-11-01T00:00:00.000Z",
				},
			},
		])
	})

	it("leaves a row a later approval or a revoke now owns", async () => {
		const store = new FakeStore()
		store.consents.push({
			id: "consent-1",
			scopes: ["openid", "data:ingest"],
			updatedAt: new Date("2026-11-28T00:00:01.000Z"),
		})
		const ctx = context(store, new APIError("BAD_REQUEST", { error: "expired_token" }))
		rememberDeviceApproval(ctx, {
			userCode: "ABCDEFGH",
			userId: "user-1",
			write: {
				kind: "merged",
				id: "consent-1",
				previousScopes: ["openid"],
				previousResources: [],
				previousUpdatedAt: "2026-11-01T00:00:00.000Z",
				writtenAt: WRITTEN_AT,
			},
		})
		await settleDeviceApproval(ctx)
		expect(store.updates).toEqual([])
	})

	it("ignores a request whose before-hook recorded nothing", async () => {
		const store = new FakeStore()
		const ctx = context(store, APPROVED)
		await settleDeviceApproval(ctx)
		expect(store.deleted).toEqual([])
		expect(store.updates).toEqual([])
	})
})
