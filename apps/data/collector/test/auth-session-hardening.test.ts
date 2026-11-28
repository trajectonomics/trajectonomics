import { describe, expect, test } from "bun:test"
import type { Credentials } from "../src/auth/credentials"
import { accessToken, REFRESH_RETRY_MS, type SessionDeps } from "../src/auth/session"
import { credentials, queueFetch, ROTATED_ACCESS, ROTATED_REFRESH, tokenBody } from "./support/auth"

function makeDeps(
	fetch: SessionDeps["fetch"],
	saved: Credentials[],
	options: { sleeps?: number[] } = {},
): SessionDeps {
	return {
		fetch,
		nowIso: () => "2026-11-28T12:00:00.000Z",
		save: (next) => {
			saved.push(next)
		},
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

describe("accessToken hardening", () => {
	test("retries a 429 inside the reuse window and then succeeds", async () => {
		const fetched = queueFetch([
			{ status: 429, body: { error: "rate_limited" } },
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
	})

	test("refuses a stored plain-http issuer before the refresh token leaves", async () => {
		const fetched = queueFetch([])
		const saved: Credentials[] = []
		const error = await failure(
			accessToken(
				credentials({ issuer: "http://auth.synthetic.test" }),
				makeDeps(fetched.fetch, saved),
			),
		)

		expect((error as Error).message).toContain("issuer must use https")
		expect(fetched.calls).toHaveLength(0)
		expect(saved).toEqual([])
	})
})
