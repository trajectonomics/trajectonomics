/** The local origin and the seeded clients the spike drives. Everything here is synthetic. */
const randomPort = 20_000 + Math.floor(Math.random() * 30_000)
export const PORT = Number(process.env["SPIKE_PORT"] ?? String(randomPort))
export const BASE_URL = `http://127.0.0.1:${PORT}`

export const TEST_USER = {
	email: "spike-test-user@example.test",
	password: "spike-test-password-1234",
	name: "Spike Test User",
}

export const DEVICE_CODE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code"

export const SCOPES = "openid offline_access data:ingest"

/** Seeded by `migrations/0003_oauth_clients.sql`, not created over HTTP (gate 5). */
export const COLLECTOR_CLIENT_ID = "traj-data-collector"
export const WEB_CLIENT_ID = "traj-data-web"

/** The spike-only clock header; the dev sign-in gate is the only way to enable it. */
export const SPIKE_NOW_HEADER = "x-spike-now"

/** The Worker vars the spike injects into `wrangler dev`; no secret reaches the repository. */
export const DEV_VARS: Record<string, string> = {
	ENVIRONMENT: "development",
	DEV_ONLY: "true",
	BETTER_AUTH_URL: BASE_URL,
	BETTER_AUTH_SECRET: "local-spike-only-secret-at-least-32-characters",
	PASSKEY_RP_ID: "localhost",
	PASSKEY_ORIGIN: BASE_URL,
}
