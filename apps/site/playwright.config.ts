import { defineConfig, devices } from "@playwright/test"

const PORT = 8791
const BASE_URL = `http://127.0.0.1:${PORT}`

/**
 * Browser checks of the built Site, served by the Worker (`wrangler dev`), so the trailing-slash
 * and Not-found rules are the production ones ([ADR 0002](./docs/adr/0002-site-worker-with-static-assets.md)).
 */
export default defineConfig({
	testDir: "e2e",
	testMatch: "**/*.e2e.ts",
	fullyParallel: true,
	retries: 0,
	reporter: process.env["CI"] ? [["list"], ["html", { open: "never" }]] : "list",
	use: {
		baseURL: BASE_URL,
		trace: "retain-on-failure",
		permissions: ["clipboard-read", "clipboard-write"],
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: `./node_modules/.bin/wrangler dev --ip 127.0.0.1 --port ${PORT} --inspector-port ${PORT + 1} --show-interactive-dev-session=false`,
		url: `${BASE_URL}/th/`,
		reuseExistingServer: false,
		timeout: 120_000,
		env: { BROWSER: "none", WRANGLER_SEND_METRICS: "false" },
	},
})
