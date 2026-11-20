import { expect, test } from "@playwright/test"
import { homeOf, openPage } from "./pages"

/** The English home, whose comparison a still phone reads whole (ADR 0019). */
const HOME = homeOf("en")

test.describe("the comparison on a phone with motion reduced", () => {
	test.use({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" })

	test("shows both panels, one above the other and still, with no control between them", async ({
		page,
	}) => {
		await openPage(page, HOME)
		for (const side of ["without", "with"]) {
			const panel = page.locator(`.compare-panel[data-side="${side}"]`)
			await expect(panel).toBeVisible()
			await expect(panel).not.toHaveAttribute("data-motion", "play")
		}
		expect(await page.locator("[data-action-compare]").getAttribute("data-action-stage")).toBeNull()
		await expect(page.locator("[data-action-next]")).toBeHidden()
		await expect(page.locator("[data-action-again]")).toBeHidden()
	})
})

test.describe("the comparison on a phone with no script", () => {
	test.use({ viewport: { width: 375, height: 812 }, javaScriptEnabled: false })

	test("shows both panels, whole, and offers no control that cannot happen", async ({ page }) => {
		await openPage(page, HOME)
		for (const side of ["without", "with"]) {
			const panel = page.locator(`.compare-panel[data-side="${side}"]`)
			await expect(panel).toBeVisible()
		}
		await expect(page.locator(".compare-panel .chat-message")).toHaveCount(15)
		await expect(page.locator("[data-action-next]")).toBeHidden()
		await expect(page.locator("[data-action-again]")).toBeHidden()
	})
})
