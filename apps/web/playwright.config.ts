import { defineConfig, devices } from "@playwright/test"
import {
	BASE_URL,
	BROWSER_PORT,
	HOSTED_ORIGIN,
	HOSTED_PORT,
	HOSTED_PREFIX,
	SCRATCH_ORIGIN,
	SCRATCH_PORT,
} from "./browser/base-url"

/**
 * Browser checks of the built Demo: `dist/` served on loopback, with `?demo=1`
 * ([ADR 0026](./docs/adr/0026-a-headless-browser-checks-the-demo-at-phone-width-and-in-print.md)).
 * They assert rules (no horizontal scroll, a table that fits A4, no dark colours in print) and take
 * screenshots for people to look at. There is no pixel comparison and there are no baselines.
 */
export default defineConfig({
	testDir: "browser",
	testMatch: "**/*.e2e.ts",
	fullyParallel: true,
	retries: 0,
	workers: process.env["CI"] ? 2 : "50%",
	reporter: process.env["CI"] ? [["list"], ["html", { open: "never" }]] : "list",
	use: { trace: "retain-on-failure" },
	projects: [
		{
			name: "chromium",
			testIgnore: ["**/hosted*.e2e.ts", "**/flow-label-min-font.e2e.ts"],
			use: { ...devices["Desktop Chrome"], baseURL: BASE_URL },
		},
		// Chromium's own minimum font size, as a person sets it: the diagram must fit at the size it draws.
		{
			name: "min-font",
			testMatch: "**/flow-label-min-font.e2e.ts",
			use: {
				...devices["Desktop Chrome"],
				baseURL: BASE_URL,
				launchOptions: { args: ["--blink-settings=minimumFontSize=24"] },
			},
		},
		// The hosted Demo (web ADR 0028), under the base path the Site serves it at.
		{
			name: "hosted",
			testMatch: "**/hosted*.e2e.ts",
			use: { ...devices["Desktop Chrome"], baseURL: HOSTED_ORIGIN },
		},
	],
	webServer: [
		{
			command: "bun browser/serve.ts",
			url: `${BASE_URL}/`,
			reuseExistingServer: false,
			timeout: 30_000,
			env: { TRAJ_WEB_BROWSER_PORT: String(BROWSER_PORT) },
		},
		{
			command: "bun browser/serve-hosted.ts",
			url: `${HOSTED_ORIGIN}${HOSTED_PREFIX}/`,
			reuseExistingServer: false,
			timeout: 30_000,
			env: { TRAJ_WEB_BROWSER_HOSTED_PORT: String(HOSTED_PORT) },
		},
		// An editable Dashboard over a scratch fictional ledger, for the checks that write (cli ADR-0075). It makes its
		// own scratch directory, so it is stopped with SIGTERM: its handler removes the directory, where SIGKILL skips it.
		{
			command: "bun browser/serve-scratch.ts",
			url: `${SCRATCH_ORIGIN}/`,
			reuseExistingServer: false,
			timeout: 180_000,
			gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
			env: { TRAJ_WEB_BROWSER_SCRATCH_PORT: String(SCRATCH_PORT) },
		},
	],
})
