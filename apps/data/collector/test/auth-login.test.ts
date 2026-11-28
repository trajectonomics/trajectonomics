import { describe, expect, test } from "bun:test"
import type { Credentials } from "../src/auth/credentials"
import type { AuthFetch } from "../src/auth/http"
import { type LoginDeps, login } from "../src/auth/login"
import {
	ACCESS_TOKEN,
	ACCOUNT_ID,
	DEVICE_CODE,
	deviceBody,
	fakeJwt,
	formFields,
	queueFetch,
	REFRESH_TOKEN,
	ROTATED_REFRESH,
	tokenBody,
} from "./support/auth"

const ISSUER = "https://auth.synthetic.test"
const START = Date.parse("2026-11-28T12:00:00.000Z")

function makeLogin(fetch: AuthFetch) {
	let now = START
	const sleeps: number[] = []
	const saved: Credentials[] = []
	const logs: string[] = []
	const outs: string[] = []
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
		log: (line) => logs.push(line),
		out: (line) => outs.push(line),
	}
	return { deps, sleeps, saved, logs, outs }
}

describe("login", () => {
	test("polls pending, then slow_down, then saves the grant", async () => {
		const access = fakeJwt({ sub: ACCOUNT_ID })
		const fetched = queueFetch([
			{ status: 200, body: deviceBody() },
			{ status: 400, body: { error: "authorization_pending" } },
			{ status: 400, body: { error: "slow_down" } },
			{ status: 200, body: tokenBody({ access_token: access, refresh_token: ROTATED_REFRESH }) },
		])
		const run = makeLogin(fetched.fetch)

		const outcome = await login(ISSUER, run.deps)

		expect(outcome).toEqual({ ok: true, accountId: ACCOUNT_ID })
		expect(run.sleeps).toEqual([5_000, 5_000, 10_000])
		expect(run.saved).toEqual([
			{
				version: 1,
				issuer: ISSUER,
				clientId: "traj-data-collector",
				accountId: ACCOUNT_ID,
				refreshToken: ROTATED_REFRESH,
				grantStartedAt: "2026-11-28T12:00:20.000Z",
				refreshedAt: "2026-11-28T12:00:20.000Z",
			},
		])
		expect(run.logs).toEqual([
			`Open ${ISSUER}/device?user_code=ABCD-EFGH and confirm the code ABCD-EFGH.`,
			"Waiting for approval…",
		])
		expect(run.outs).toEqual([`Signed in. Account id: ${ACCOUNT_ID}`])
		expect(formFields(fetched.calls[0]!)).toEqual({
			client_id: "traj-data-collector",
			scope: "openid offline_access data:ingest",
			resource: "https://trajectonomics.com/data",
		})
		expect(formFields(fetched.calls[1]!)).toEqual({
			grant_type: "urn:ietf:params:oauth:grant-type:device_code",
			device_code: DEVICE_CODE,
			client_id: "traj-data-collector",
		})
		const output = JSON.stringify({ logs: run.logs, outs: run.outs })
		expect(output).not.toContain(DEVICE_CODE)
		expect(output).not.toContain(ACCESS_TOKEN)
		expect(output).not.toContain(REFRESH_TOKEN)
		expect(output).not.toContain(ROTATED_REFRESH)
		expect(output).not.toContain(access)
	})

	test("fails when the sign-in is declined", async () => {
		const fetched = queueFetch([
			{ status: 200, body: deviceBody() },
			{ status: 400, body: { error: "access_denied" } },
		])
		const run = makeLogin(fetched.fetch)

		expect(await login(ISSUER, run.deps)).toEqual({
			ok: false,
			message: "the sign-in was declined",
		})
		expect(run.saved).toEqual([])
	})

	test("stops polling when the code expires", async () => {
		const pending = { status: 400, body: { error: "authorization_pending" } }
		const fetched = queueFetch([
			{ status: 200, body: deviceBody({ expires_in: 10 }) },
			pending,
			pending,
		])
		const run = makeLogin(fetched.fetch)

		const outcome = await login(ISSUER, run.deps)

		expect(outcome).toEqual({ ok: false, message: "the code expired; run login again" })
		expect(run.sleeps).toEqual([5_000, 5_000])
		expect(fetched.calls).toHaveLength(2)
		expect(run.saved).toEqual([])
	})

	test("reports a device code request that fails", async () => {
		const fetched = queueFetch([{ status: 500, body: { error: "server_error" } }])
		const run = makeLogin(fetched.fetch)

		expect(await login(ISSUER, run.deps)).toEqual({
			ok: false,
			message: "device code request failed: HTTP 500",
		})
	})
})
