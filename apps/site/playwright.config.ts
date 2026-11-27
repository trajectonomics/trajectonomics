import { defineConfig, devices } from "@playwright/test"

// Two Runs in one repository are separate checkouts, never separate machines, so a Run whose sibling
// holds the default port picks another one ([factory ADR 0006](https://github.com/trajectonomics/factory/blob/main/docs/adr/0006-runs-are-not-exclusive-per-repository.md)).
import { BASE_URL, SITE_BROWSER_PORT as PORT } from "./e2e/base-url"

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
	// The baselines e2e/visual.e2e.ts is validated against, committed so CI can compare them.
	snapshotDir: "e2e/visual-snapshots",
	snapshotPathTemplate: "{snapshotDir}/{arg}{ext}",
	expect: {
		toHaveScreenshot: {
			animations: "disabled",
			caret: "hide",
			maxDiffPixelRatio: 0.01,
		},
	},
	use: {
		baseURL: BASE_URL,
		trace: "retain-on-failure",
		permissions: ["clipboard-read", "clipboard-write"],
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		// The apex route would otherwise make the Worker see trajectonomics.com and set the production
		// cookie Domain, which a browser on 127.0.0.1 refuses (ADR 0033).
		command: `./node_modules/.bin/wrangler dev --ip 127.0.0.1 --port ${PORT} --inspector-port ${PORT + 1} --infer-origin-from-routes=false --show-interactive-dev-session=false`,
		url: `${BASE_URL}/`,
		reuseExistingServer: false,
		timeout: 120_000,
		env: { BROWSER: "none", WRANGLER_SEND_METRICS: "false" },
	},
})
