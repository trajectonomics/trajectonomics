import { describe, expect, it } from "bun:test"
import { authOptions, requireSecret } from "./auth"
import { oauthHookOptions } from "./auth-options"
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

	it("never honours the spike's hold or clock headers in production, even with DEV_ONLY set", () => {
		const production = oauthHookOptions({ env: env({ DEV_ONLY: "true" }) })
		const loopback = oauthHookOptions({
			env: env({ DEV_ONLY: "true", BETTER_AUTH_URL: "http://localhost:8787" }),
		})
		const development = oauthHookOptions({
			env: env({
				ENVIRONMENT: "development",
				DEV_ONLY: "true",
				BETTER_AUTH_URL: "http://localhost:8787",
			}),
		})
		for (const options of [production, loopback]) {
			expect(options).toMatchObject({ testClock: false, spikeHold: false })
		}
		// The control: the same assertion would pass for a gate that is never on.
		expect(development).toMatchObject({ testClock: true, spikeHold: true })
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

	it("installs the JWT, passkey, OAuth provider, device, grant and account plugins once", () => {
		const ids = authOptions({ env: env() })
			.plugins?.map((plugin) => plugin.id)
			.sort()
		expect(ids).toEqual([
			"device-authorization",
			"grant-management",
			"jwt",
			"marketing-consent",
			"oauth-provider",
			"passkey",
			"pending-deletion",
		])
	})

	it("enables rate limiting explicitly and stores it in D1", () => {
		const options = authOptions({ env: env() })
		expect(options.rateLimit?.enabled).toBe(true)
		expect(options.rateLimit?.storage).toBe("database")
		// The provider's own token rule is 20/min; the custom rule must not be looser.
		expect(options.rateLimit?.customRules?.["/oauth2/token"]).toEqual({ window: 60, max: 20 })
		expect(options.rateLimit?.customRules?.["/device"]).toEqual({ window: 60, max: 5 })
		expect(options.rateLimit?.customRules?.["/device/deny"]).toEqual({ window: 60, max: 5 })
		expect(options.advanced?.ipAddress?.ipAddressHeaders).toEqual(["cf-connecting-ip"])
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

	it("treats an empty social placeholder as absent", () => {
		const options = authOptions({ env: env({ GITHUB_CLIENT_ID: "", GITHUB_CLIENT_SECRET: "" }) })
		expect(options.socialProviders).toEqual({})
	})

	it("refuses a missing or short secret instead of using the library default", () => {
		expect(() =>
			authOptions({ env: env({ BETTER_AUTH_SECRET: undefined as unknown as string }) }),
		).toThrow()
		expect(() => requireSecret("too-short")).toThrow()
		expect(requireSecret("x".repeat(32))).toBe("x".repeat(32))
	})

	it("trusts only its own origin in production and disables /token, delete-consent and update-consent", () => {
		const options = authOptions({ env: env() })
		expect(options.trustedOrigins).toEqual(["https://auth.example.test"])
		expect(options.disabledPaths).toContain("/token")
		expect(options.disabledPaths).toContain("/oauth2/delete-consent")
		expect(options.disabledPaths).toContain("/oauth2/update-consent")
	})
})
