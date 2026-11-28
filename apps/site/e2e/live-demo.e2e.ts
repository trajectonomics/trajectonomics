import { expect, type Page, test } from "@playwright/test"
import { dictionaryFor } from "../src/lib/language/languages"
import { DEMO_PATH } from "../src/lib/site"
import { homeOf, openPage } from "./pages"

/** The English home, whose live Demo section shows the hosted Dashboard (ADR 0034). */
const HOME = homeOf("en")

/** That home's Dictionary. */
const dictionary = dictionaryFor(HOME.language)

/**
 * Open the home, scroll the live Demo section into view so its lazy iframe loads, and wait until the
 * Dashboard inside it has read the Snapshot. Returns the frame, so a check can drive the Dashboard.
 */
async function openLiveDemo(page: Page) {
	await openPage(page, HOME)
	await page.locator("[data-live-demo]").scrollIntoViewIfNeeded()
	const demo = page.frameLocator("iframe")
	// The Dashboard's own greeting is the proof the frame runs the real build.
	await expect(
		demo.getByRole("heading", { name: /this is your current situation/, level: 1 }),
	).toBeVisible({ timeout: 20_000 })
	await expect(demo.getByText("Loading…")).toHaveCount(0, { timeout: 20_000 })
	return demo
}

test("the home embeds the real Dashboard and zooms it like browser zoom", async ({ page }) => {
	await openLiveDemo(page)
	await expect(page.getByRole("link", { name: dictionary.liveDemoOpen })).toHaveAttribute(
		"href",
		DEMO_PATH,
	)

	const level = page.locator("[data-live-level]")
	const zoomOut = page.locator("[data-live-out]")
	const zoomIn = page.locator("[data-live-in]")
	await expect(level).toHaveText("100%")
	await expect(zoomOut).toBeEnabled()
	await expect(zoomIn).toBeEnabled()

	await zoomOut.click()
	await expect(level).toHaveText("90%")
	await zoomOut.click()
	await expect(level).toHaveText("80%")
	// The zoom lays the Dashboard out at 1/0.8 of the visible box before scaling it down to fit.
	const sizes = await page.evaluate(() => {
		const viewport = document.querySelector("[data-live-viewport]")
		const frame = viewport?.querySelector("iframe")
		return { frame: frame?.offsetWidth ?? 0, box: viewport?.clientWidth ?? 0 }
	})
	expect(sizes.frame, "the iframe lays out wider than the visible box").toBeGreaterThan(sizes.box)

	// The percentage button returns to 100%, and the top step disables Zoom in.
	await page.locator("[data-live-reset]").click()
	await expect(level).toHaveText("100%")
	await zoomIn.click()
	await expect(level).toHaveText("110%")
	await zoomIn.click()
	await expect(level).toHaveText("125%")
	await expect(zoomIn).toBeDisabled()
	await expect(zoomOut).toBeEnabled()
	// The top step marks Zoom in aria-disabled, not disabled, so the focus stays on it, and a press
	// there does nothing; the status line has said the new level.
	await expect(zoomIn).toBeFocused()
	await zoomIn.click({ force: true })
	await expect(level).toHaveText("125%")
	await expect(page.locator("[data-live-said]")).toHaveText("125%")
})

test.describe("the live Demo on a phone", () => {
	test.use({ viewport: { width: 320, height: 720 } })

	test("wraps its bar, keeps its controls visible and never scrolls the page sideways", async ({
		page,
	}) => {
		await openLiveDemo(page)
		const layout = await page.evaluate(() => ({
			overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
			gutter: Math.min(
				...[...document.querySelectorAll("[data-live]")].map(
					(live) => live.getBoundingClientRect().left,
				),
			),
		}))
		expect(layout.overflow, "the page does not scroll sideways").toBe(false)
		expect(layout.gutter, "the frame keeps a side gutter").toBeGreaterThanOrEqual(16)
		for (const selector of ["[data-live-out]", "[data-live-reset]", "[data-live-in]"]) {
			await expect(page.locator(selector)).toBeVisible()
		}
		await expect(page.locator(".live-open")).toBeVisible()

		// Zooming out widens the Dashboard's layout without widening the page.
		await page.locator("[data-live-out]").click()
		await page.locator("[data-live-out]").click()
		await expect(page.locator("[data-live-level]")).toHaveText("80%")
		await expect
			.poll(() =>
				page.evaluate(
					() => document.documentElement.scrollWidth > document.documentElement.clientWidth,
				),
			)
			.toBe(false)
	})
})
