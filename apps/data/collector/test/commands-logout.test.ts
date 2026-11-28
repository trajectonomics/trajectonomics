import { describe, expect, test } from "bun:test"
import type { Credentials } from "../src/auth/credentials"
import type { AuthFetch } from "../src/auth/http"
import { type LogoutDeps, logout } from "../src/commands/logout"
import { credentials, formFields, queueFetch } from "./support/auth"

const ACCOUNT_URL =
	"The grant could not be revoked here; revoke it on https://auth.trajectonomics.com/account/."

function makeDeps(fetch: AuthFetch, options: { credentials?: Credentials | null } = {}) {
	const printed: string[] = []
	const removed: string[] = []
	const deps: LogoutDeps = {
		fetch,
		read: () => (options.credentials === undefined ? credentials() : options.credentials),
		remove: () => removed.push("removed"),
		log: (line) => printed.push(line),
		out: (line) => printed.push(line),
	}
	return { deps, printed, removed }
}

describe("logout", () => {
	test("deletes the file even when the revoke is rejected", async () => {
		const fetched = queueFetch([{ status: 500, body: { error: "server_error" } }])
		const run = makeDeps(fetched.fetch)

		const outcome = await logout(run.deps)

		expect(outcome).toEqual({ exitCode: 0 })
		expect(run.removed).toEqual(["removed"])
		expect(run.printed).toEqual(["Signed out.", ACCOUNT_URL])
	})

	test("deletes the file even when the revoke cannot be reached", async () => {
		const fetched = queueFetch([new Error("synthetic offline")])
		const run = makeDeps(fetched.fetch)

		expect(await logout(run.deps)).toEqual({ exitCode: 0 })
		expect(run.removed).toEqual(["removed"])
		expect(run.printed).toEqual(["Signed out.", ACCOUNT_URL])
	})

	test("revokes the stored refresh token", async () => {
		const fetched = queueFetch([{ status: 200, body: { revoked: true } }])
		const run = makeDeps(fetched.fetch)

		expect(await logout(run.deps)).toEqual({ exitCode: 0 })
		expect(formFields(fetched.calls[0]!)).toEqual({
			token: "rt-test-1",
			token_type_hint: "refresh_token",
			client_id: "traj-data-collector",
		})
		expect(run.printed).toEqual(["Signed out."])
	})

	test("says so when there is nothing to sign out of", async () => {
		const fetched = queueFetch([])
		const run = makeDeps(fetched.fetch, { credentials: null })

		expect(await logout(run.deps)).toEqual({ exitCode: 0 })
		expect(run.printed).toEqual(["Not signed in."])
		expect(run.removed).toEqual([])
		expect(fetched.calls).toHaveLength(0)
	})
})
