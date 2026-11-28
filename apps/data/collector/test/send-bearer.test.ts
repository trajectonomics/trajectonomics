import { describe, expect, test } from "bun:test"
import type { Credentials } from "../src/auth/credentials"
import type { AuthFetch } from "../src/auth/http"
import { SignInExpiredError } from "../src/auth/session"
import { type BearerDeps, type BearerRequest, resolveBearer } from "../src/send/bearer"
import { credentials, queueFetch, ROTATED_ACCESS, ROTATED_REFRESH, tokenBody } from "./support/auth"

const CREDENTIALS_PATH = "/home/synthetic/.config/traj-data/credentials.json"
const KEY_FILE = "/home/synthetic/.config/traj-data/ingest.key"
const URL = "https://trajectonomics.com/data/ingest"

function request(overrides: Partial<BearerRequest> = {}): BearerRequest {
	return {
		credentialsPath: CREDENTIALS_PATH,
		keyFile: KEY_FILE,
		url: URL,
		tokenUrlAllowed: true,
		forceKey: false,
		...overrides,
	}
}

function makeDeps(
	fetch: AuthFetch,
	options: { credentials?: Credentials | null; key?: string; saveError?: Error } = {},
) {
	const saved: Credentials[] = []
	const logs: string[] = []
	const calls: string[] = []
	const deps: BearerDeps = {
		readCredentials: () => {
			calls.push("credentials")
			return options.credentials ?? null
		},
		saveCredentials: (_path, next) => {
			calls.push("save")
			if (options.saveError !== undefined) throw options.saveError
			saved.push(next)
		},
		readKey: () => {
			calls.push("key")
			return options.key ?? "synthetic-ingest-key"
		},
		fetch,
		nowIso: () => "2026-11-28T12:00:00.000Z",
		sleep: async () => {},
		log: (line) => logs.push(line),
	}
	return { calls, deps, logs, saved }
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

		const bearer = await resolveBearer(request(), run.deps)

		expect(bearer).toEqual({ bearer: ROTATED_ACCESS, kind: "token" })
		expect(run.saved).toEqual([
			credentials(),
			{ ...credentials(), refreshToken: ROTATED_REFRESH, refreshedAt: "2026-11-28T12:00:00.000Z" },
		])
		expect(run.calls).toEqual(["credentials", "save", "save"])
		expect(run.logs).toEqual([])
	})

	test("uses the key only when the credentials file is absent", async () => {
		const fetched = queueFetch([])
		const run = makeDeps(fetched.fetch, { credentials: null })

		const bearer = await resolveBearer(request(), run.deps)

		expect(bearer).toEqual({ bearer: "synthetic-ingest-key", kind: "key" })
		expect(run.logs).toEqual(["send: using the temporary ingest key; run login to switch"])
		expect(fetched.calls).toHaveLength(0)
	})

	test("an explicit --key-file skips the credentials file", async () => {
		const fetched = queueFetch([])
		const run = makeDeps(fetched.fetch, { credentials: credentials() })

		const bearer = await resolveBearer(request({ forceKey: true }), run.deps)

		expect(bearer).toEqual({ bearer: "synthetic-ingest-key", kind: "key" })
		expect(run.calls).toEqual(["key"])
		expect(run.logs).toEqual(["send: using the ingest key from --key-file"])
		expect(fetched.calls).toHaveLength(0)
	})

	test("refuses to send a token to another origin before refreshing", async () => {
		const fetched = queueFetch([])
		const run = makeDeps(fetched.fetch, { credentials: credentials() })

		const error = await resolveBearer(
			request({ url: "http://127.0.0.1:8787/data/ingest", tokenUrlAllowed: false }),
			run.deps,
		).catch((reason: unknown) => reason)

		expect((error as Error).message).toBe(
			"refusing to send a sign-in token to http://127.0.0.1:8787; pass --key-file or set TRAJ_DATA_ALLOW_TOKEN_URL=1",
		)
		expect(fetched.calls).toHaveLength(0)
		expect(run.calls).toEqual(["credentials"])
	})

	test("a broken credentials read never falls back to the key", async () => {
		const fetched = queueFetch([])
		const run = makeDeps(fetched.fetch)
		const deps: BearerDeps = {
			...run.deps,
			readCredentials: () => {
				throw new Error("credentials file must be a regular file")
			},
		}

		await expect(resolveBearer(request(), deps)).rejects.toThrow("must be a regular file")
		expect(run.calls).toEqual([])
		expect(fetched.calls).toHaveLength(0)
	})

	test("never falls back to the key when the refresh says the grant is gone", async () => {
		const fetched = queueFetch([{ status: 400, body: { error: "invalid_grant" } }])
		const run = makeDeps(fetched.fetch, { credentials: credentials() })

		await expect(resolveBearer(request(), run.deps)).rejects.toBeInstanceOf(SignInExpiredError)
		expect(run.calls).not.toContain("key")
		expect(run.logs).toEqual([])
	})

	test("a failed preflight save names the credentials file and never fetches", async () => {
		const fetched = queueFetch([])
		const run = makeDeps(fetched.fetch, {
			credentials: credentials(),
			saveError: new Error("synthetic read-only mount"),
		})

		await expect(resolveBearer(request(), run.deps)).rejects.toThrow(
			`credentials file ${CREDENTIALS_PATH} cannot be written: synthetic read-only mount`,
		)
		expect(fetched.calls).toHaveLength(0)
	})
})
