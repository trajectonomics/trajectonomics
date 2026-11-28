import { describe, expect, test } from "bun:test"
import type { Credentials } from "../src/auth/credentials"
import type { AuthFetch } from "../src/auth/http"
import { type LoginDeps, login } from "../src/auth/login"
import {
	ACCOUNT_ID,
	deviceBody,
	fakeJwt,
	queueFetch,
	ROTATED_REFRESH,
	tokenBody,
} from "./support/auth"

const ISSUER = "https://auth.synthetic.test"
const START = Date.parse("2026-11-28T12:00:00.000Z")
const OLD_GRANT = "2026-11-01T00:00:00.000Z"

function makeLogin(fetch: AuthFetch, existing: Credentials | null) {
	let now = START
	const saved: Credentials[] = []
	const deps: LoginDeps = {
		fetch,
		sleep: async (milliseconds) => {
			now += milliseconds
		},
		nowMs: () => now,
		save: (credentials) => {
			saved.push(credentials)
		},
		read: () => existing,
		log: () => {},
		out: () => {},
	}
	return { deps, saved }
}

function queuedLogin(account: string) {
	return queueFetch([
		{ status: 200, body: deviceBody() },
		{
			status: 200,
			body: tokenBody({
				access_token: fakeJwt({ sub: account }),
				refresh_token: ROTATED_REFRESH,
			}),
		},
	])
}

describe("login and the grant date", () => {
	test("keeps a live grant's original date on a re-login for the same account", async () => {
		const fetched = queuedLogin(ACCOUNT_ID)
		const existing: Credentials = {
			version: 1,
			issuer: ISSUER,
			clientId: "traj-data-collector",
			accountId: ACCOUNT_ID,
			refreshToken: "rt-old",
			grantStartedAt: OLD_GRANT,
			refreshedAt: OLD_GRANT,
		}
		const run = makeLogin(fetched.fetch, existing)

		expect(await login(ISSUER, run.deps)).toEqual({ ok: true, accountId: ACCOUNT_ID })
		expect(run.saved[0]?.grantStartedAt).toBe(OLD_GRANT)
		expect(run.saved[0]?.refreshedAt).toBe("2026-11-28T12:00:05.000Z")
	})

	test("starts a new grant when the old one is 90 days old", async () => {
		const fetched = queuedLogin(ACCOUNT_ID)
		const existing: Credentials = {
			version: 1,
			issuer: ISSUER,
			clientId: "traj-data-collector",
			accountId: ACCOUNT_ID,
			refreshToken: "rt-old",
			grantStartedAt: "2026-08-30T12:00:00.000Z",
			refreshedAt: "2026-08-30T12:00:00.000Z",
		}
		const run = makeLogin(fetched.fetch, existing)

		expect(await login(ISSUER, run.deps)).toEqual({ ok: true, accountId: ACCOUNT_ID })
		expect(run.saved[0]?.grantStartedAt).toBe("2026-11-28T12:00:05.000Z")
	})

	test("starts a new grant for another account", async () => {
		const fetched = queuedLogin("user-synthetic-2")
		const existing: Credentials = {
			version: 1,
			issuer: ISSUER,
			clientId: "traj-data-collector",
			accountId: ACCOUNT_ID,
			refreshToken: "rt-old",
			grantStartedAt: OLD_GRANT,
			refreshedAt: OLD_GRANT,
		}
		const run = makeLogin(fetched.fetch, existing)

		await login(ISSUER, run.deps)
		expect(run.saved[0]?.grantStartedAt).toBe("2026-11-28T12:00:05.000Z")
	})

	test("a broken existing file does not stop the new sign-in", async () => {
		const fetched = queuedLogin(ACCOUNT_ID)
		const run = makeLogin(fetched.fetch, null)
		const deps: LoginDeps = {
			...run.deps,
			read: () => {
				throw new Error("synthetic malformed credentials")
			},
		}

		expect(await login(ISSUER, deps)).toEqual({ ok: true, accountId: ACCOUNT_ID })
		expect(run.saved[0]?.grantStartedAt).toBe("2026-11-28T12:00:05.000Z")
	})
})
