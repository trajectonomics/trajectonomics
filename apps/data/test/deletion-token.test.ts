import { beforeAll, describe, expect, test } from "bun:test"
import { INGEST_PATH, INTERNAL_HOST, SITE_ORIGIN } from "../src/core/urls"
import { handleRequest } from "../src/http/router"
import { NOW_MS, usageRow } from "./support/fixtures"
import { harness } from "./support/http"
import { fakeJwks } from "./support/jwks"
import { type TestSigner, testSigner } from "./support/token"

let signer: TestSigner

beforeAll(async () => {
	signer = await testSigner()
})

describe("a tombstoned account", () => {
	test("cannot ingest with a token issued before the deletion", async () => {
		const context = harness()
		const sub = "deleted-user"
		const deleted = await handleRequest(
			new Request(`https://${INTERNAL_HOST}/internal/contributors/delete`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ authUserId: sub }),
			}),
			context.env,
			{ nowMs: NOW_MS },
		)
		expect(deleted.status).toBe(200)

		// The signer stamps `iat` a minute before the fixed clock, as a token issued before deletion.
		const token = await signer.sign({ sub })
		const response = await handleRequest(
			new Request(`${SITE_ORIGIN}${INGEST_PATH}`, {
				method: "POST",
				headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
				body: JSON.stringify({ usage: [usageRow()] }),
			}),
			context.env,
			{ nowMs: NOW_MS, jwks: fakeJwks(signer.jwks) },
		)
		expect(response.status).toBe(403)
		expect(await response.json()).toEqual({ error: "account_deleted" })
	})
})
