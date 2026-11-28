import { expect, type Page, test } from "@playwright/test"
import { SCRATCH_ORIGIN } from "./base-url"
import { openDemo } from "./demo"
import { expectNoSideScroll } from "./guided-plan"

/**
 * Serves the Demo's Snapshot with no plan in it, the state a ledger with no plans makes: only the Snapshot's plan list
 * and the compare pair are emptied, so the reads stay the ones the Demo states.
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

test("Home with no plan on the scratch ledger keeps its cards at 360px", async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 800 })
	// The scratch server reads its own ledger; emptying the plan list is a read, and nothing is written (rule 8, #851).
	await page.route("**/snapshot.json", async (route) => {
		const response = await route.fetch()
		const snapshot = await response.json()
		snapshot.params.scenarios = []
		snapshot.params.compare = null
		await route.fulfill({ response, json: snapshot })
	})
	await page.goto(`${SCRATCH_ORIGIN}/`)
	const action = page.locator("[data-primary-action]")
	await expect(action).toHaveText("Set up a first plan")
	await expect(action).toHaveAttribute("href", "/plans/new/")
	await expect(page.getByRole("heading", { name: "Net worth" })).toBeVisible()
	await expect(page.getByRole("heading", { name: "Accounts" })).toBeVisible()
	await expectNoSideScroll(page)
	await page.screenshot({ path: "screenshots/first-plan/360/scratch-home.png", fullPage: true })
})
