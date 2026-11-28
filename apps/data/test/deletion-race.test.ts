import type { Database } from "bun:sqlite"
import { beforeAll, describe, expect, test } from "bun:test"
import { sha256Hex } from "../src/core/hash"
import { INGEST_PATH, INTERNAL_HOST, SITE_ORIGIN } from "../src/core/urls"
import type { Env } from "../src/env"
import type { JwksSource } from "../src/http/jwks"
import { handleRequest } from "../src/http/router"
import { NOW_ISO, NOW_MS, usageRow } from "./support/fixtures"
import { harness } from "./support/http"
import { type TestSigner, testSigner } from "./support/token"

const SUB = "auth-user-race"

let signer: TestSigner
let keys: JwksSource

beforeAll(async () => {
	signer = await testSigner()
	keys = { get: async () => ({ set: signer.jwks, fetched: false }) }
})

function orgBinding(database: Database): string | null {
	const row = database
		.prepare("SELECT auth_user_id FROM contributor WHERE id = 'trajectonomics'")
		.get() as { auth_user_id: string | null }
	return row.auth_user_id
}

/** Whether the value appears in any column of any table, as a string scan of every row. */
function holdsValue(database: Database, value: string): boolean {
	const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as {
		name: string
	}[]
	return tables.some(({ name }) => {
		const rows = database.prepare(`SELECT * FROM "${name}"`).all() as Record<string, unknown>[]
		return rows.some((row) => JSON.stringify(row).includes(value))
	})
}

function ingest(token: string, env: Env): Promise<Response> {
	return handleRequest(
		new Request(`${SITE_ORIGIN}${INGEST_PATH}`, {
			method: "POST",
			headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
			body: JSON.stringify({ usage: [usageRow()] }),
		}),
		env,
		{ nowMs: NOW_MS, jwks: keys },
	)
}

function deletion(context: ReturnType<typeof harness>, authUserId: string): Promise<Response> {
	return handleRequest(
		new Request(`https://${INTERNAL_HOST}/internal/contributors/delete`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ authUserId }),
		}),
		context.env,
		{ nowMs: NOW_MS },
	)
}

describe("a deletion racing the org's first bind", () => {
	test("a deletion between the owner's read and the bind leaves the org unbound", async () => {
		const context = harness()
		const env = { ...context.env, ORG_AUTH_USER_ID: SUB }
		let deletionStatus = 0
		context.beforeNextBatch(async () => {
			deletionStatus = (await deletion(context, SUB)).status
		})
		const response = await ingest(await signer.sign({ sub: SUB }), env)
		expect(deletionStatus).toBe(200)
		expect(response.status).toBe(200)
		expect(orgBinding(context.database)).toBeNull()
		expect(holdsValue(context.database, SUB)).toBe(false)
	})

	test("a deletion after the bind unbinds the org and tombstones the id", async () => {
		const context = harness()
		const env = { ...context.env, ORG_AUTH_USER_ID: SUB }
		expect((await ingest(await signer.sign({ sub: SUB }), env)).status).toBe(200)
		expect(orgBinding(context.database)).toBe(SUB)
		expect((await deletion(context, SUB)).status).toBe(200)
		expect(orgBinding(context.database)).toBeNull()
		const tombstone = context.database
			.prepare("SELECT COUNT(*) AS n FROM contributor_tombstone WHERE auth_user_hash = ?")
			.get(await sha256Hex(SUB)) as { n: number }
		expect(tombstone.n).toBe(1)
		expect(holdsValue(context.database, SUB)).toBe(false)
	})

	test("a deletion is exactly one D1 call", async () => {
		const context = harness()
		context.database
			.prepare(
				"INSERT INTO contributor (id, auth_user_id, handle, kind, created_at) VALUES (?, ?, NULL, 'community', ?)",
			)
			.run("community-1", SUB, NOW_ISO)
		context.database
			.prepare(
				"INSERT INTO ingest_log (contributor_id, received_at, rows, status) VALUES (?, ?, 1, 'accepted')",
			)
			.run("community-1", NOW_ISO)
		const before = context.calls()
		expect((await deletion(context, SUB)).status).toBe(200)
		expect(context.calls() - before).toBe(1)
		const left = context.database
			.prepare("SELECT COUNT(*) AS n FROM contributor WHERE id = 'community-1'")
			.get() as { n: number }
		expect(left.n).toBe(0)
	})
})
