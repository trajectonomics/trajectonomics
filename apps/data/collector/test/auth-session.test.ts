import { describe, expect, test } from "bun:test"
import { DATA_AUDIENCE } from "../src/auth/config"
import type { Credentials } from "../src/auth/credentials"
import {
	accessToken,
	REFRESH_RETRY_MS,
	type SessionDeps,
	SignInExpiredError,
} from "../src/auth/session"
import {
	credentials,
	formFields,
	queueFetch,
	ROTATED_ACCESS,
	ROTATED_REFRESH,
	tokenBody,
} from "./support/auth"

const NOW_ISO = "2026-11-28T12:00:00.000Z"

function makeDeps(
	fetch: SessionDeps["fetch"],
	saved: Credentials[],
	options: { save?: SessionDeps["save"]; sleeps?: number[] } = {},
): SessionDeps {
	return {
		fetch,
		nowIso: () => NOW_ISO,
		save:
			options.save ??
			((next) => {
				saved.push(next)
			}),
		sleep: async (milliseconds) => {
			options.sleeps?.push(milliseconds)
		},
	}
}

async function failure(promise: Promise<unknown>): Promise<unknown> {
	return promise.then(
		() => new Error("expected a rejection"),
		(reason: unknown) => reason,
	)
}

describe("accessToken", () => {
	test("rewrites the current credentials, then saves the rotation before returning", async () => {
		const rotated = tokenBody({ access_token: ROTATED_ACCESS, refresh_token: ROTATED_REFRESH })
		const fetched = queueFetch([{ status: 200, body: rotated }])
		const saved: Credentials[] = []
		const events: string[] = []
		const token = await accessToken(credentials(), {
			...makeDeps(fetched.fetch, saved),
			save: (next) => {
				events.push("save")
				saved.push(next)
			},
		})

		expect(token).toBe(ROTATED_ACCESS)
		expect(events).toEqual(["save", "save"])
		expect(saved).toEqual([
			credentials(),
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

	test("does not resolve while the rotated save is still pending", async () => {
		const fetched = queueFetch([
			{
				status: 200,
				body: tokenBody({ access_token: ROTATED_ACCESS, refresh_token: ROTATED_REFRESH }),
			},
		])
		let release: () => void = () => {}
		const gate = new Promise<void>((resolve) => {
			release = resolve
		})
		let reached: () => void = () => {}
		const atSave = new Promise<void>((resolve) => {
			reached = resolve
		})
		let saves = 0
		let state = "pending"
		const tokenPromise = accessToken(credentials(), {
			...makeDeps(fetched.fetch, []),
			save: () => {
				saves += 1
				if (saves !== 2) return
				reached()
				return gate
			},
		})
		tokenPromise.finally(() => {
			state = "settled"
		})

		await atSave
		await Promise.resolve()
		expect(state).toBe("pending")
		release()
		expect(await tokenPromise).toBe(ROTATED_ACCESS)
		expect(state).toBe("settled")
	})

	test("turns invalid_grant into the sign-in expired error without retrying", async () => {
		const fetched = queueFetch([{ status: 400, body: { error: "invalid_grant" } }])
		const saved: Credentials[] = []
		const sleeps: number[] = []
		const error = await failure(
			accessToken(credentials(), makeDeps(fetched.fetch, saved, { sleeps })),
		)

		expect(error).toBeInstanceOf(SignInExpiredError)
		expect((error as Error).message).toBe(
			"sign-in expired or was revoked; run the collector's login command again",
		)
		expect(fetched.calls).toHaveLength(1)
		expect(sleeps).toEqual([])
		expect(saved).toEqual([credentials()])
	})

	test("retries a 5xx three times and reports only the status", async () => {
		const body = { error: "server_error", refresh_token: "rt-body-secret" }
		const fetched = queueFetch([
			{ status: 500, body },
			{ status: 503, body },
			{ status: 500, body },
		])
		const saved: Credentials[] = []
		const sleeps: number[] = []
		const error = await failure(
			accessToken(credentials(), makeDeps(fetched.fetch, saved, { sleeps })),
		)

		const message = error instanceof Error ? error.message : ""
		expect(message).toBe("token refresh failed: HTTP 500")
		expect(message).not.toContain("rt-body-secret")
		expect(fetched.calls).toHaveLength(3)
		expect(sleeps).toEqual([REFRESH_RETRY_MS, REFRESH_RETRY_MS])
		expect(saved).toEqual([credentials()])
	})

	test("retries a lost response and then succeeds", async () => {
		const fetched = queueFetch([
			new Error("synthetic timeout"),
			{
				status: 200,
				body: tokenBody({ access_token: ROTATED_ACCESS, refresh_token: ROTATED_REFRESH }),
			},
		])
		const saved: Credentials[] = []
		const sleeps: number[] = []
		const token = await accessToken(credentials(), makeDeps(fetched.fetch, saved, { sleeps }))

		expect(token).toBe(ROTATED_ACCESS)
		expect(fetched.calls).toHaveLength(2)
		expect(sleeps).toEqual([REFRESH_RETRY_MS])
		expect(saved).toHaveLength(2)
	})

	test("retries a 2xx body that does not parse as tokens", async () => {
		const fetched = queueFetch([
			{ status: 200, body: { refresh_token: ROTATED_REFRESH } },
			{
				status: 200,
				body: tokenBody({ access_token: ROTATED_ACCESS, refresh_token: ROTATED_REFRESH }),
			},
		])
		const saved: Credentials[] = []
		const token = await accessToken(credentials(), makeDeps(fetched.fetch, saved))

		expect(token).toBe(ROTATED_ACCESS)
		expect(fetched.calls).toHaveLength(2)
	})

	test("never retries another 4xx", async () => {
		const fetched = queueFetch([{ status: 400, body: { error: "invalid_request" } }])
		const sleeps: number[] = []
		const error = await failure(accessToken(credentials(), makeDeps(fetched.fetch, [], { sleeps })))

		expect((error as Error).message).toBe("token refresh failed: HTTP 400")
		expect(fetched.calls).toHaveLength(1)
		expect(sleeps).toEqual([])
	})

	test("fails before the token endpoint when the credentials cannot be saved", async () => {
		const fetched = queueFetch([])
		const error = await failure(
			accessToken(credentials(), {
				...makeDeps(fetched.fetch, []),
				save: () => {
					throw new Error("synthetic read-only mount")
				},
			}),
		)

		expect((error as Error).message).toBe("synthetic read-only mount")
		expect(fetched.calls).toHaveLength(0)
	})
})
