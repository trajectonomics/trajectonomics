import { describe, expect, test } from "bun:test"
import type { Credentials } from "../src/auth/credentials"
import type { AuthFetch } from "../src/auth/http"
import { SignInExpiredError } from "../src/auth/session"
import { type BearerDeps, resolveBearer } from "../src/send/bearer"
import { credentials, queueFetch, ROTATED_ACCESS, ROTATED_REFRESH, tokenBody } from "./support/auth"

const CREDENTIALS_PATH = "/home/synthetic/.config/traj-data/credentials.json"
const KEY_FILE = "/home/synthetic/.config/traj-data/ingest.key"

function makeDeps(
	fetch: AuthFetch,
	options: { credentials?: Credentials | null; key?: string } = {},
) {
	const saved: Credentials[] = []
	const logs: string[] = []
	let keyReads = 0
	const deps: BearerDeps = {
		readCredentials: () => options.credentials ?? null,
		saveCredentials: (_path, next) => {
			saved.push(next)
		},
		readKey: () => {
			keyReads += 1
			return options.key ?? "synthetic-ingest-key"
		},
		fetch,
		nowIso: () => "2026-11-28T12:00:00.000Z",
		log: (line) => logs.push(line),
	}
	return { deps, saved, logs, keyReads: () => keyReads }
}

describe("resolveBearer", () => {
	test("uses a refreshed token when credentials exist", async () => {
		const fetched = queueFetch([
			{
				status: 200,
				body: tokenBody({ access_token: ROTATED_ACCESS, refresh_token: ROTATED_REFRESH }),
			},
		])
		const run = makeDeps(fetched.fetch, { credentials: credentials() })

		const bearer = await resolveBearer({
			credentialsPath: CREDENTIALS_PATH,
			keyFile: KEY_FILE,
			deps: run.deps,
		})

		expect(bearer).toEqual({ bearer: ROTATED_ACCESS, kind: "token" })
		expect(run.saved).toHaveLength(1)
		expect(run.saved[0]?.refreshToken).toBe(ROTATED_REFRESH)
		expect(run.keyReads()).toBe(0)
		expect(run.logs).toEqual([])
	})

	test("falls back to the key only when the credentials file is absent", async () => {
		const fetched = queueFetch([])
		const run = makeDeps(fetched.fetch, { credentials: null, key: "synthetic-ingest-key" })

		const bearer = await resolveBearer({
			credentialsPath: CREDENTIALS_PATH,
			keyFile: KEY_FILE,
			deps: run.deps,
		})

		expect(bearer).toEqual({ bearer: "synthetic-ingest-key", kind: "key" })
		expect(run.logs).toEqual(["send: using the temporary ingest key; run login to switch"])
		expect(fetched.calls).toHaveLength(0)
	})

	test("never falls back to the key when the refresh fails", async () => {
		const fetched = queueFetch([{ status: 400, body: { error: "invalid_grant" } }])
		const run = makeDeps(fetched.fetch, { credentials: credentials() })
		const error: unknown = await resolveBearer({
			credentialsPath: CREDENTIALS_PATH,
			keyFile: KEY_FILE,
			deps: run.deps,
		}).catch((reason: unknown) => reason)

		expect(error).toBeInstanceOf(SignInExpiredError)
		expect(run.keyReads()).toBe(0)
		expect(run.logs).toEqual([])
	})
})
