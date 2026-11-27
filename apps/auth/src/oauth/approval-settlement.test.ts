import { describe, expect, it } from "bun:test"
import { APIError } from "better-auth/api"
import { rememberDeviceApproval } from "./approval"
import { settleDeviceApproval } from "./approval-settlement"
import { type ConsentRow, FakeConsentDatabase } from "./fake-consent-database"

type Where = Array<{ field: string; value: unknown }>
type Device = { id: string } & Record<string, unknown>

/** The after-hook's only adapter call: the final `deviceCode` status. */
class FakeDeviceStore {
	devices: Device[] = []

	adapter = {
		findOne: async ({ model, where }: { model: string; where: Where }): Promise<unknown> => {
			if (model !== "deviceCode") return null
			return this.devices.find((row) => rowMatches(row, where)) ?? null
		},
	}
}

function rowMatches(row: Record<string, unknown>, where: Where): boolean {
	return where.every((clause) => row[clause.field] === clause.value)
}

const APPROVED = { success: true }
const REFUSED = new APIError("BAD_REQUEST", { error: "device_code_already_processed" })
const WRITTEN_AT = new Date("2026-11-28T00:00:00.000Z")
const LATER = "2026-11-28T00:00:01.000Z"

function setup(rows: ConsentRow[] = [], returned: unknown = APPROVED) {
	const store = new FakeDeviceStore()
	const consents = new FakeConsentDatabase(rows)
	const ctx = { context: { adapter: store.adapter, returned } }
	return { store, consents, ctx, database: consents.database }
}

function device(store: FakeDeviceStore, status: string, userId = "user-1"): void {
	store.devices.push({ id: "d1", userCode: "ABCDEFGH", status, userId })
}

describe("settleDeviceApproval", () => {
	it("keeps the created consent when the endpoint approved the code", async () => {
		const { store, consents, ctx, database } = setup()
		device(store, "approved")
		rememberDeviceApproval(ctx, {
			userCode: "ABCDEFGH",
			userId: "user-1",
			write: { kind: "created", id: "consent-1", writtenAt: WRITTEN_AT },
		})
		await settleDeviceApproval(ctx, database, WRITTEN_AT)
		expect(consents.statements).toEqual([])
		expect(consents.rows).toEqual([])
	})

	it("keeps the created consent when the endpoint threw but the code ended approved", async () => {
		const { store, consents, ctx, database } = setup(
			[{ id: "consent-1", updatedAt: WRITTEN_AT.toISOString() }],
			REFUSED,
		)
		device(store, "approved")
		rememberDeviceApproval(ctx, {
			userCode: "ABCDEFGH",
			userId: "user-1",
			write: { kind: "created", id: "consent-1", writtenAt: WRITTEN_AT },
		})
		await settleDeviceApproval(ctx, database, WRITTEN_AT)
		expect(consents.statements).toEqual([])
		expect(consents.rows).toHaveLength(1)
	})

	it("deletes the created consent when the endpoint refused the code", async () => {
		const { store, consents, ctx, database } = setup(
			[{ id: "consent-1", updatedAt: WRITTEN_AT.toISOString() }],
			REFUSED,
		)
		device(store, "pending")
		rememberDeviceApproval(ctx, {
			userCode: "ABCDEFGH",
			userId: "user-1",
			write: { kind: "created", id: "consent-1", writtenAt: WRITTEN_AT },
		})
		await settleDeviceApproval(ctx, database, WRITTEN_AT)
		expect(consents.rows).toEqual([])
	})

	it("keeps a successful approval whose code was redeemed before settlement", async () => {
		const { consents, ctx, database } = setup([
			{ id: "consent-1", updatedAt: WRITTEN_AT.toISOString() },
		])
		// No device row: the poll redeemed the code and the library deleted it.
		rememberDeviceApproval(ctx, {
			userCode: "ABCDEFGH",
			userId: "user-1",
			write: { kind: "created", id: "consent-1", writtenAt: WRITTEN_AT },
		})
		await settleDeviceApproval(ctx, database, WRITTEN_AT)
		expect(consents.statements).toEqual([])
		expect(consents.rows).toHaveLength(1)
	})

	it("deletes the created consent when the code ended up denied", async () => {
		const { store, consents, ctx, database } = setup(
			[{ id: "consent-1", updatedAt: WRITTEN_AT.toISOString() }],
			REFUSED,
		)
		device(store, "denied")
		rememberDeviceApproval(ctx, {
			userCode: "ABCDEFGH",
			userId: "user-1",
			write: { kind: "created", id: "consent-1", writtenAt: WRITTEN_AT },
		})
		await settleDeviceApproval(ctx, database, WRITTEN_AT)
		expect(consents.rows).toEqual([])
	})

	it("restores the scopes a failed approval had merged into a live consent", async () => {
		const { store, consents, ctx, database } = setup(
			[
				{
					id: "consent-1",
					scopes: `["openid","data:ingest"]`,
					resources: `["https://trajectonomics.com/data"]`,
					updatedAt: WRITTEN_AT.toISOString(),
				},
			],
			REFUSED,
		)
		device(store, "pending")
		rememberDeviceApproval(ctx, {
			userCode: "ABCDEFGH",
			userId: "user-1",
			write: {
				kind: "merged",
				id: "consent-1",
				previousScopes: ["openid"],
				previousResources: [],
				writtenAt: WRITTEN_AT,
			},
		})
		await settleDeviceApproval(ctx, database, WRITTEN_AT)
		expect(consents.rows[0]).toMatchObject({
			scopes: `["openid"]`,
			resources: null,
			updatedAt: "2026-11-28T00:00:00.001Z",
		})
	})

	it("leaves a merged row a later approval now owns", async () => {
		const { store, consents, ctx, database } = setup(
			[{ id: "consent-1", scopes: `["openid","data:ingest"]`, updatedAt: LATER }],
			REFUSED,
		)
		device(store, "pending")
		rememberDeviceApproval(ctx, {
			userCode: "ABCDEFGH",
			userId: "user-1",
			write: {
				kind: "merged",
				id: "consent-1",
				previousScopes: ["openid"],
				previousResources: [],
				writtenAt: WRITTEN_AT,
			},
		})
		await settleDeviceApproval(ctx, database, WRITTEN_AT)
		expect(consents.rows[0]?.["scopes"]).toBe(`["openid","data:ingest"]`)
	})

	it("leaves a created row a later approval merged over", async () => {
		const { store, consents, ctx, database } = setup(
			[{ id: "consent-1", scopes: `["openid","data:ingest"]`, updatedAt: LATER }],
			REFUSED,
		)
		device(store, "pending")
		rememberDeviceApproval(ctx, {
			userCode: "ABCDEFGH",
			userId: "user-1",
			write: { kind: "created", id: "consent-1", writtenAt: WRITTEN_AT },
		})
		await settleDeviceApproval(ctx, database, WRITTEN_AT)
		expect(consents.rows).toHaveLength(1)
	})

	it("ignores a request whose before-hook recorded nothing", async () => {
		const { consents, ctx, database } = setup()
		await settleDeviceApproval(ctx, database, WRITTEN_AT)
		expect(consents.statements).toEqual([])
	})
})
