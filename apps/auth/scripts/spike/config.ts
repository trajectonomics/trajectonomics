/** The local origin and the test client the spike drives. Everything here is synthetic. */
const randomPort = 20_000 + Math.floor(Math.random() * 30_000)
export const PORT = Number(process.env["SPIKE_PORT"] ?? String(randomPort))
export const BASE_URL = `http://127.0.0.1:${PORT}`

export const TEST_USER = {
	email: "spike-test-user@example.test",
	password: "spike-test-password-1234",
	name: "Spike Test User",
}

export const DEVICE_CODE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code"

export const SCOPES = "openid profile email offline_access data:ingest"

/** The test OAuth client: a native CLI with no secret, as a device-flow CLI is. */
export const TEST_CLIENT = {
	clientName: "Trajectonomics collector spike",
	redirectUri: "http://127.0.0.1:53682/callback",
	grantTypes: [DEVICE_CODE_GRANT_TYPE, "refresh_token"],
	scopes: SCOPES,
}

/** The Worker vars the spike injects into `wrangler dev`; no secret reaches the repository. */
export const DEV_VARS: Record<string, string> = {
	ENVIRONMENT: "development",
	DEV_ONLY: "true",
	BETTER_AUTH_URL: BASE_URL,
	BETTER_AUTH_SECRET: "local-spike-only-secret-at-least-32-characters",
	PASSKEY_RP_ID: "localhost",
	PASSKEY_ORIGIN: BASE_URL,
}
