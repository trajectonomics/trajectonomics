import { expect, type Page, test } from "@playwright/test"
import { openDemo } from "./demo"
import { expectNoSideScroll } from "./guided-plan"

/**
 * Serves the Demo with no plan in it, the state a ledger with no plans makes: only the Snapshot's plan list and the
 * compare pair are emptied, so the reads stay the ones the Demo states.
 */
async function serveNoPlan(page: Page): Promise<void> {
	await page.route("**/demo/snapshot.json", async (route) => {
		const response = await route.fetch()
		const snapshot = await response.json()
		snapshot.params.scenarios = []
		snapshot.params.compare = null
		await route.fulfill({ response, json: snapshot })
	})
}

for (const path of ["/", "/plans/"]) {
	test(`the guided first-plan entry on ${path} fits 360px with no plan`, async ({ page }) => {
		await page.setViewportSize({ width: 360, height: 800 })
		await serveNoPlan(page)
		await openDemo(page, path, { theme: "light" })
		const link = page.getByRole("link", { name: "Set up a first plan" })
		await expect(link).toBeVisible()
		await expect(link).toHaveAttribute("href", "/plans/new/?demo=1")
		await expectNoSideScroll(page)
		await page.screenshot({
			path: `screenshots/first-plan/360${path === "/" ? "/home" : "/plans"}.png`,
			fullPage: true,
		})
	})
}
