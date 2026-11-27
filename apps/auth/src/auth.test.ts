import { describe, expect, it } from "bun:test"
import { authOptions } from "./auth"
import type { Env } from "./env"

function env(overrides: Partial<Env> = {}): Env {
	return {
		DB: {} as Env["DB"],
		BETTER_AUTH_SECRET: "synthetic-secret-at-least-32-characters-long",
		BETTER_AUTH_URL: "https://auth.example.test",
		ENVIRONMENT: "production",
		...overrides,
	}
}

describe("authOptions", () => {
	it("keeps the dev sign-in off in production, even with DEV_ONLY set", () => {
		const options = authOptions({ env: env({ DEV_ONLY: "true" }) })
		expect(options.emailAndPassword?.enabled).toBe(false)
	})

	it("enables email and password only for a loopback development origin", () => {
		const options = authOptions({
			env: env({
				ENVIRONMENT: "development",
				DEV_ONLY: "true",
				BETTER_AUTH_URL: "http://localhost:8787",
			}),
		})
		expect(options.emailAndPassword?.enabled).toBe(true)
	})

	it("installs the JWT, passkey, OAuth provider and device plugins exactly once", () => {
		const ids = authOptions({ env: env() })
			.plugins?.map((plugin) => plugin.id)
			.sort()
		expect(ids).toEqual(["device-authorization", "jwt", "oauth-provider", "passkey"])
	})

	it("turns on a social provider only when both halves exist", () => {
		const without = authOptions({ env: env() })
		expect(without.socialProviders).toEqual({})
		const withGoogle = authOptions({
			env: env({ GOOGLE_CLIENT_ID: "synthetic-id", GOOGLE_CLIENT_SECRET: "synthetic-secret" }),
		})
		expect(withGoogle.socialProviders?.["google"]).toBeDefined()
		expect(withGoogle.socialProviders?.["github"]).toBeUndefined()
	})
})
