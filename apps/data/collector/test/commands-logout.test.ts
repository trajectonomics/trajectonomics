import { describe, expect, test } from "bun:test"
import type { Credentials } from "../src/auth/credentials"
import type { AuthFetch } from "../src/auth/http"
import { type LogoutDeps, logout } from "../src/auth/logout"
import { credentials, formFields, queueFetch } from "./support/auth"

const DEFAULT_ISSUER = "https://auth.synthetic.test"

function makeDeps(
	fetch: AuthFetch,
	options: {
		credentials?: Credentials | null
		readError?: Error
		removeError?: Error
		defaultIssuer?: string
	} = {},
) {
	const printed: string[] = []
	const removed: string[] = []
	const deps: LogoutDeps = {
		fetch,
		read: () => {
			if (options.readError !== undefined) throw options.readError
			return options.credentials === undefined ? credentials() : options.credentials
		},
		remove: () => {
			if (options.removeError !== undefined) throw options.removeError
			removed.push("removed")
		},
		defaultIssuer: options.defaultIssuer ?? DEFAULT_ISSUER,
		log: (line) => printed.push(line),
		out: (line) => printed.push(line),
	}
	return { deps, printed, removed }
}

function hint(issuer: string): string {
	return `The grant could not be revoked here; revoke it on ${issuer}/account/.`
}

describe("logout", () => {
	test("deletes the file even when the revoke is rejected", async () => {
		const fetched = queueFetch([{ status: 500, body: { error: "server_error" } }])
		const run = makeDeps(fetched.fetch)

		const outcome = await logout(run.deps)

		expect(outcome).toEqual({ exitCode: 0 })
		expect(run.removed).toEqual(["removed"])
		expect(run.printed).toEqual(["Signed out.", hint(DEFAULT_ISSUER)])
	})

	test("deletes the file even when the revoke cannot be reached", async () => {
		const fetched = queueFetch([new Error("synthetic offline")])
		const run = makeDeps(fetched.fetch)

		expect(await logout(run.deps)).toEqual({ exitCode: 0 })
		expect(run.removed).toEqual(["removed"])
		expect(run.printed).toEqual(["Signed out.", hint(DEFAULT_ISSUER)])
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

	test("deletes a file it cannot read and points at the configured issuer", async () => {
		const fetched = queueFetch([])
		const run = makeDeps(fetched.fetch, {
			readError: new Error("credentials file is malformed"),
			defaultIssuer: "https://auth.default.test",
		})

		expect(await logout(run.deps)).toEqual({ exitCode: 0 })
		expect(run.removed).toEqual(["removed"])
		expect(run.printed).toEqual(["Signed out.", hint("https://auth.default.test")])
		expect(fetched.calls).toHaveLength(0)
	})

	test("exits 1 when the file itself cannot be removed", async () => {
		const fetched = queueFetch([{ status: 200, body: { revoked: true } }])
		const run = makeDeps(fetched.fetch, {
			removeError: new Error("synthetic permission denied"),
		})

		expect(await logout(run.deps)).toEqual({ exitCode: 1 })
		expect(run.printed).toEqual(["logout: synthetic permission denied"])
	})

	test("never sends the refresh token to a stored plain-http issuer, and still deletes", async () => {
		const fetched = queueFetch([])
		const run = makeDeps(fetched.fetch, {
			credentials: credentials({ issuer: "http://auth.synthetic.test" }),
		})

		const outcome = await logout(run.deps)

		expect(outcome).toEqual({ exitCode: 0 })
		expect(fetched.calls).toHaveLength(0)
		expect(run.removed).toEqual(["removed"])
		expect(run.printed).toEqual(["Signed out.", hint("http://auth.synthetic.test")])
	})
})
