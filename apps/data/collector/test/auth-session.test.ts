import { describe, expect, test } from "bun:test"
import { DATA_AUDIENCE } from "../src/auth/config"
import type { Credentials } from "../src/auth/credentials"
import { accessToken, type SessionDeps, SignInExpiredError } from "../src/auth/session"
import {
	credentials,
	formFields,
	queueFetch,
	ROTATED_ACCESS,
	ROTATED_REFRESH,
	tokenBody,
} from "./support/auth"

const NOW_ISO = "2026-11-28T12:00:00.000Z"

function makeDeps(fetch: SessionDeps["fetch"], saved: Credentials[]): SessionDeps {
	return {
		fetch,
		nowIso: () => NOW_ISO,
		save: (next) => {
			saved.push(next)
		},
	}
}

describe("accessToken", () => {
	test("saves the rotated refresh token before returning the access token", async () => {
		const fetched = queueFetch([
			{
				status: 200,
				body: tokenBody({ access_token: ROTATED_ACCESS, refresh_token: ROTATED_REFRESH }),
			},
		])
		const saved: Credentials[] = []
		let returned = false
		let savedBeforeReturn = false
		const token = await accessToken(credentials(), {
			...makeDeps(fetched.fetch, saved),
			save: (next) => {
				savedBeforeReturn = !returned
				saved.push(next)
			},
		})
		returned = true

		expect(token).toBe(ROTATED_ACCESS)
		expect(savedBeforeReturn).toBe(true)
		expect(saved).toEqual([
			{ ...credentials(), refreshToken: ROTATED_REFRESH, refreshedAt: NOW_ISO },
		])
		expect(formFields(fetched.calls[0]!)).toEqual({
			grant_type: "refresh_token",
			refresh_token: "rt-test-1",
			client_id: "traj-data-collector",
			resource: DATA_AUDIENCE,
		})
		expect(fetched.calls[0]!.url).toBe("https://auth.synthetic.test/api/auth/oauth2/token")
	})

	test("turns invalid_grant into the sign-in expired error", async () => {
		const fetched = queueFetch([{ status: 400, body: { error: "invalid_grant" } }])
		const saved: Credentials[] = []
		const error: unknown = await accessToken(credentials(), makeDeps(fetched.fetch, saved)).catch(
			(reason: unknown) => reason,
		)

		expect(error).toBeInstanceOf(SignInExpiredError)
		expect((error as Error).message).toBe(
			"sign-in expired or was revoked; run: bun src/cli.ts login",
		)
		expect(saved).toEqual([])
	})

	test("names only the status of another failure", async () => {
		const body = { error: "server_error", refresh_token: "rt-body-secret" }
		const fetched = queueFetch([{ status: 500, body }])
		const saved: Credentials[] = []
		const error: unknown = await accessToken(credentials(), makeDeps(fetched.fetch, saved)).catch(
			(reason: unknown) => reason,
		)

		const message = error instanceof Error ? error.message : ""
		expect(message).toBe("token refresh failed: HTTP 500")
		expect(message).not.toContain("rt-body-secret")
		expect(saved).toEqual([])
	})
})
