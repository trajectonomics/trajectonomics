import { expect, test } from "@playwright/test"
import { openDemo, SCREENSHOTS } from "./demo"

// The Plan's item drawer (#703): the one card inside the 384px drawer takes the drawer's content width, not
// the half a `sm:grid-cols-2` would give it at a desktop viewport.

test("the drawer's loan card takes the drawer's width, not half of it", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/projection/?scenario=base&items=assets", { theme: "light" })

	await page
		.locator('[role="tabpanel"] button[data-plan-item]', { hasText: /paid off/ })
		.first()
		.click()
	const drawer = page.locator("dialog[open]")
	await expect(drawer).toBeVisible()
	const list = drawer.locator('section[aria-label="Loans"] ul')
	const card = list.locator("li").first()
	await expect(card).toBeVisible()
	const [cardWidth, listWidth] = await Promise.all([
		card.evaluate((element) => element.getBoundingClientRect().width),
		list.evaluate((element) => element.getBoundingClientRect().width),
	])
	expect(cardWidth, "the card against its list").toBeGreaterThanOrEqual(listWidth * 0.9)

	await page.screenshot({ path: `${SCREENSHOTS}/plan-items/1280-light-drawer-loan.png` })
})
