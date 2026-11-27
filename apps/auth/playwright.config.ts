import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig, devices } from "@playwright/test"
import { BASE_URL, AUTH_BROWSER_PORT as PORT } from "./e2e/base-url"
import { scratchDir } from "./e2e/scratch"

const scratch = scratchDir()
if (scratch === undefined) {
	throw new Error("run `bun e2e/prepare.ts` before Playwright; the scratch D1 is missing")
}

const packageRoot = dirname(fileURLToPath(import.meta.url))
const wrangler = resolve(packageRoot, "node_modules", ".bin", "wrangler")
const devVars = {
	ENVIRONMENT: "development",
	DEV_ONLY: "true",
	BETTER_AUTH_URL: BASE_URL,
	BETTER_AUTH_SECRET: "local-e2e-only-secret-at-least-32-characters",
	PASSKEY_RP_ID: "localhost",
	PASSKEY_ORIGIN: BASE_URL,
	// Not credentials: they make the Worker offer Google, so a check can send its error callback.
	// The browser's visit to Google is intercepted, and no check reaches the token exchange.
	GOOGLE_CLIENT_ID: "e2e-placeholder-google-client-id",
	GOOGLE_CLIENT_SECRET: "e2e-placeholder-google-client-secret",
}
const command = [
	wrangler,
	"dev",
	"--local",
	"--ip",
	"127.0.0.1",
	"--port",
	String(PORT),
	"--inspector-port",
	String(PORT + 1),
	"--persist-to",
	scratch,
	"--infer-origin-from-routes=false",
	"--show-interactive-dev-session=false",
	...Object.entries(devVars).flatMap(([key, value]) => ["--var", `${key}:${value}`]),
]
	.map((part) => `"${part}"`)
	.join(" ")

export default defineConfig({
	testDir: "e2e",
	testMatch: "**/*.e2e.ts",
	fullyParallel: false,
	workers: 1,
	retries: 0,
	reporter: "list",
	globalTeardown: "./e2e/teardown.ts",
	use: { baseURL: BASE_URL, trace: "retain-on-failure" },
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command,
		url: `${BASE_URL}/api/auth/ok`,
		reuseExistingServer: false,
		timeout: 120_000,
		env: { BROWSER: "none", WRANGLER_SEND_METRICS: "false" },
	},
})
