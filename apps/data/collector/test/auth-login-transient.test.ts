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

function makeLogin(fetch: AuthFetch) {
	let now = START
	const sleeps: number[] = []
	const saved: Credentials[] = []
	const deps: LoginDeps = {
		fetch,
		sleep: async (milliseconds) => {
			sleeps.push(milliseconds)
			now += milliseconds
		},
		nowMs: () => now,
		save: (credentials) => {
			saved.push(credentials)
		},
		read: () => null,
		log: () => {},
		out: () => {},
	}
	return { deps, sleeps, saved }
}

function granted() {
	return {
		status: 200,
		body: tokenBody({ access_token: fakeJwt({ sub: ACCOUNT_ID }), refresh_token: ROTATED_REFRESH }),
	}
}

describe("login and transient poll failures", () => {
	test("waits longer on a 429 and keeps polling", async () => {
		const fetched = queueFetch([
			{ status: 200, body: deviceBody() },
			{ status: 429, body: { error: "slow_down" } },
			granted(),
		])
		const run = makeLogin(fetched.fetch)

		expect(await login(ISSUER, run.deps)).toEqual({ ok: true, accountId: ACCOUNT_ID })
		expect(run.sleeps).toEqual([5_000, 10_000])
		expect(run.saved).toHaveLength(1)
	})

	test("waits longer on a 429 without an error field", async () => {
		const fetched = queueFetch([
			{ status: 200, body: deviceBody() },
			{ status: 429, body: null },
			granted(),
		])
		const run = makeLogin(fetched.fetch)

		expect(await login(ISSUER, run.deps)).toEqual({ ok: true, accountId: ACCOUNT_ID })
		expect(run.sleeps).toEqual([5_000, 10_000])
	})

	test("waits longer on a 5xx and keeps polling", async () => {
		const fetched = queueFetch([
			{ status: 200, body: deviceBody() },
			{ status: 503, body: { error: "temporarily_unavailable" } },
			granted(),
		])
		const run = makeLogin(fetched.fetch)

		expect(await login(ISSUER, run.deps)).toEqual({ ok: true, accountId: ACCOUNT_ID })
		expect(run.sleeps).toEqual([5_000, 10_000])
	})

	test("waits longer when the poll's fetch throws", async () => {
		const fetched = queueFetch([
			{ status: 200, body: deviceBody() },
			new Error("synthetic offline"),
			granted(),
		])
		const run = makeLogin(fetched.fetch)

		expect(await login(ISSUER, run.deps)).toEqual({ ok: true, accountId: ACCOUNT_ID })
		expect(run.sleeps).toEqual([5_000, 10_000])
		expect(fetched.calls).toHaveLength(3)
	})
})
